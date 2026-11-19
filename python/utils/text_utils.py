"""
text_utils.py — Stateless utility functions.
"""

import uuid
from datetime import datetime, timezone


def generate_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def truncate(s: str, max_length: int) -> str:
    if len(s) <= max_length:
        return s
    return s[:max_length - 1] + "…"


def capitalize(s: str) -> str:
    if not s:
        return s
    return s[0].upper() + s[1:]
