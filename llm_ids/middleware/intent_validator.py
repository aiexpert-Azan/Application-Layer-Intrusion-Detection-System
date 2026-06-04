from typing import Any

try:
    from ai_pipeline.inference import classify
except ModuleNotFoundError:  # pragma: no cover - fallback for package execution
    from llm_ids.ai_pipeline.inference import classify

from llm_ids.database.db import log_attack


_BLOCKED_LABELS = {
    "PROMPT_INJECTION",
    "SENSITIVE_INFO",
    "OUTPUT_INJECTION",
}


async def validate_intent(text: str, client: dict[str, Any], db_log: bool = True) -> dict[str, Any]:
    result = classify(text)
    label = result["label"]
    confidence = result["confidence"]

    if label != "SAFE":
        await log_attack(
            client_id=client["id"],
            client_name=client["name"],
            threat_type=label,
            query=text,
            action="blocked",
            confidence=confidence,
            blocked=True,
        )

        return {
            "blocked": True,
            "threat_type": label if label in _BLOCKED_LABELS else label,
            "confidence": confidence,
            "message": (
                "Security violation detected. "
                "This request has been flagged and logged."
            ),
        }

    return {"blocked": False}
