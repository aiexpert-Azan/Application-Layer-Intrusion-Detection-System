from __future__ import annotations

from pathlib import Path
from typing import Any

import chromadb


TENANT_NAMES = [
    "StyleHub AI",
    "Pizza App",
    "HR Software",
    "Demo Client",
]

CLIENT_TENANT_MAP = {
    "1": "StyleHub AI",
    "2": "Pizza App",
    "3": "HR Software",
    "4": "Demo Client",
}

PERSIST_DIR = Path(__file__).resolve().parents[1] / "database" / "chroma_store"
PERSIST_DIR.mkdir(parents=True, exist_ok=True)

_CHROMA_CLIENT = chromadb.PersistentClient(path=str(PERSIST_DIR))

_SAMPLE_DOCUMENTS: dict[str, list[str]] = {
    "StyleHub AI": [
        "StyleHub AI onboarding notes for customer support workflows.",
        "StyleHub AI approved prompt templates for safe conversations.",
        "StyleHub AI escalation policy for suspicious user activity.",
        "StyleHub AI retention summary for tenant-level audit records.",
        "StyleHub AI product FAQ for internal support agents.",
    ],
    "Pizza App": [
        "Pizza App order management reference for kitchen operations.",
        "Pizza App delivery status workflow for tenant operations.",
        "Pizza App refunds checklist for customer service staff.",
        "Pizza App menu sync notes for the mobile storefront.",
        "Pizza App monthly usage summary for account managers.",
    ],
    "HR Software": [
        "HR Software employee onboarding playbook for admins.",
        "HR Software leave request policy and review steps.",
        "HR Software payroll troubleshooting notes for support.",
        "HR Software role-based access guide for HR managers.",
        "HR Software audit checklist for compliance reviews.",
    ],
    "Demo Client": [
        "Demo Client sample dashboard description for product demos.",
        "Demo Client walkthrough script for sales presentations.",
        "Demo Client sandbox dataset notes for testing.",
        "Demo Client security briefing for trial accounts.",
        "Demo Client onboarding checklist for evaluation users.",
    ],
}


def _collection_name(client_id: str) -> str:
    return f"tenant_{client_id}_vault"


def _client_ids_for_tenant(client_id: str, count: int) -> list[str]:
    return [f"tenant_{client_id}_doc_{index + 1}" for index in range(count)]


def _is_tenant_document_present(collection: Any, doc_id: str) -> bool:
    existing = collection.get(ids=[doc_id])
    return bool(existing.get("ids"))


def get_or_create_tenant_vault(client_id: str):
    collection = _CHROMA_CLIENT.get_or_create_collection(name=_collection_name(client_id))
    return collection


def add_tenant_document(client_id: str, document: str, doc_id: str):
    collection = get_or_create_tenant_vault(client_id)
    collection.upsert(
        ids=[doc_id],
        documents=[document],
        metadatas=[{"tenant_id": client_id}],
    )
    return collection


def query_tenant_vault(client_id: str, query_text: str, n_results: int = 3):
    collection = get_or_create_tenant_vault(client_id)
    return collection.query(
        query_texts=[query_text],
        n_results=n_results,
        where={"tenant_id": client_id},
    )


def detect_cross_tenant_attempt(requesting_client_id: str, query: str) -> bool:
    normalized_query = query.lower()
    requesting_tenant = CLIENT_TENANT_MAP.get(str(requesting_client_id))
    return any(
        tenant_name.lower() in normalized_query and tenant_name != requesting_tenant
        for tenant_name in TENANT_NAMES
    )


def _seed_tenant_vault(client_id: str, tenant_name: str) -> None:
    collection = get_or_create_tenant_vault(client_id)
    documents = _SAMPLE_DOCUMENTS[tenant_name]
    doc_ids = _client_ids_for_tenant(client_id, len(documents))

    for doc_id, document in zip(doc_ids, documents, strict=True):
        if not _is_tenant_document_present(collection, doc_id):
            collection.add(
                ids=[doc_id],
                documents=[document],
                metadatas=[{"tenant_id": client_id}],
            )


def initialize_tenant_vaults() -> None:
    for index, tenant_name in enumerate(TENANT_NAMES, start=1):
        _seed_tenant_vault(str(index), tenant_name)


def guard_namespace(namespace: str) -> bool:
    return True


initialize_tenant_vaults()
