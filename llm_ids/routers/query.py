from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from llm_ids.database.db import get_logs_by_client, get_stats_by_client, log_attack
from llm_ids.middleware.auth import get_current_client
from llm_ids.middleware.file_inspector import inspect_file
from llm_ids.middleware.llm_handler import get_llm_response
from llm_ids.middleware.intent_validator import validate_intent
from llm_ids.middleware.namespace_guard import (
    detect_cross_tenant_attempt,
    get_or_create_tenant_vault,
    query_tenant_vault,
)
from llm_ids.middleware.output_filter import filter_output
from llm_ids.ai_pipeline.inference import classify
from llm_ids.routers.websocket import broadcast_attack


router = APIRouter()


def _threat_response(label: str, confidence: float, message: str) -> dict[str, Any]:
    return {
        "blocked": True,
        "threat_type": label,
        "confidence": confidence,
        "message": message,
    }


def _serialize_results(results: dict[str, Any]) -> list[str]:
    documents = results.get("documents") or [[]]
    if not documents:
        return []
    return [str(document) for document in documents[0] if document]


def _build_context(results: dict[str, Any]) -> str:
    documents = _serialize_results(results)
    if not documents:
        return "No tenant vault context available."
    return "\n\n".join(f"- {document}" for document in documents)


@router.post("/query")
async def handle_query(
    payload: dict[str, Any],
    current_client: dict[str, Any] = Depends(get_current_client),
) -> dict[str, Any]:
    query_text = str(payload.get("query", "")).strip()
    if not query_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query text is required.",
        )

    if detect_cross_tenant_attempt(str(current_client["id"]), query_text):
        await log_attack(
            client_id=current_client["id"],
            client_name=current_client["name"],
            threat_type="CROSS_TENANT_ATTEMPT",
            query=query_text,
            action="blocked",
            confidence=100.0,
            blocked=True,
        )
        response = _threat_response(
            "CROSS_TENANT_ATTEMPT",
            100.0,
            "Security violation detected. This request has been flagged and logged.",
        )
        await broadcast_attack(
            str(current_client["id"]),
            {
                "threat_type": response["threat_type"],
                "query": query_text,
                "action": "BLOCKED",
                "confidence": response["confidence"],
                "client_name": current_client["name"],
            },
        )
        return response

    intent_result = await validate_intent(query_text, current_client)
    if intent_result.get("blocked"):
        await broadcast_attack(
            str(current_client["id"]),
            {
                "threat_type": intent_result["threat_type"],
                "query": query_text,
                "action": "BLOCKED",
                "confidence": intent_result["confidence"],
                "client_name": current_client["name"],
            },
        )
        return intent_result

    tenant_vault = get_or_create_tenant_vault(str(current_client["id"]))
    vault_results = query_tenant_vault(str(current_client["id"]), query_text, n_results=3)
    context = _build_context(vault_results)
    response_text = await get_llm_response(
        query=f"{query_text}\n\nTenant vault context:\n{context}",
        tenant_name=current_client["name"],
        conversation_history=payload.get("conversation_history", []),
    )
    output_result = filter_output(response_text)

    response = {
        "blocked": False,
        "client_id": current_client["id"],
        "vault": tenant_vault.name,
        "context": context,
        "response": output_result["filtered_response"],
        "output_safe": output_result["safe"],
        "output_threat_found": output_result["threat_found"],
    }
    return response


@router.post("/upload")
async def handle_upload(
    file: UploadFile = File(...),
    current_client: dict[str, Any] = Depends(get_current_client),
) -> dict[str, Any]:
    file_bytes = await file.read()
    inspection = inspect_file(file_bytes, file.filename or "uploaded_file")
    extracted_text = inspection.get("extracted_text", "")
    hidden_text_found = bool(inspection.get("hidden_text_found", False))
    classification = classify(extracted_text) if extracted_text else {"label": "SAFE", "confidence": 100.0}

    if hidden_text_found:
        await log_attack(
            client_id=current_client["id"],
            client_name=current_client["name"],
            threat_type="INDIRECT_INJECTION",
            query=extracted_text,
            action="blocked",
            confidence=100.0,
            blocked=True,
        )
        return _threat_response(
            "INDIRECT_INJECTION",
            100.0,
            "Security violation detected. This request has been flagged and logged.",
        )
        

    if classification["label"] != "SAFE":
        await log_attack(
            client_id=current_client["id"],
            client_name=current_client["name"],
            threat_type=classification["label"],
            query=extracted_text,
            action="blocked",
            confidence=classification["confidence"],
            blocked=True,
        )
        return _threat_response(
            classification["label"],
            classification["confidence"],
            "Security violation detected. This request has been flagged and logged.",
        )

    return {
        "blocked": False,
        "file_type": inspection.get("file_type"),
        "extracted_text": extracted_text,
    }


@router.get("/logs/{client_id}")
async def get_client_logs(
    client_id: int,
    current_client: dict[str, Any] = Depends(get_current_client),
) -> dict[str, Any]:
    if int(current_client["id"]) != client_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own client logs.",
        )

    return {"client_id": client_id, "logs": await get_logs_by_client(client_id)}


@router.get("/stats/{client_id}")
async def get_client_stats(
    client_id: int,
    current_client: dict[str, Any] = Depends(get_current_client),
) -> dict[str, Any]:
    if int(current_client["id"]) != client_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own client statistics.",
        )

    return {"client_id": client_id, "stats": await get_stats_by_client(client_id)}
