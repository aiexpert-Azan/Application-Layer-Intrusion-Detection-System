from __future__ import annotations

import logging
import re
from typing import Pattern


logger = logging.getLogger(__name__)

_FILTERS: list[tuple[str, Pattern[str]]] = [
    ("SCRIPT_TAG", re.compile(r"<\s*/?\s*script\b[^>]*>", re.IGNORECASE)),
    ("SQL_COMMAND", re.compile(r"\b(?:DROP|DELETE|INSERT)\b", re.IGNORECASE)),
    ("SYSTEM_PATH", re.compile(r"(?:/etc/passwd|\.\./)", re.IGNORECASE)),
    ("API_KEY", re.compile(r"\b(?:sk|pk)-[A-Za-z0-9_-]+\b", re.IGNORECASE)),
    (
        "HARDCODED_PASSWORD",
        re.compile(
            r"\bpassword\b\s*[:=]\s*['\"]?[^\s'\";]{4,}['\"]?",
            re.IGNORECASE,
        ),
    ),
]


def _replace_matches(text: str) -> tuple[str, str | None]:
    filtered_text = text
    threat_found: str | None = None

    for threat_name, pattern in _FILTERS:
        if pattern.search(filtered_text):
            threat_found = threat_found or threat_name
            filtered_text = pattern.sub("[FILTERED]", filtered_text)

    return filtered_text, threat_found


def filter_output(response_text: str) -> dict[str, str | bool | None]:
    filtered_response, threat_found = _replace_matches(response_text)
    safe = threat_found is None

    if not safe:
        logger.warning("Output injection attempt detected: %s", threat_found)

    return {
        "safe": safe,
        "filtered_response": filtered_response,
        "threat_found": threat_found,
    }
