"""
weights.py

Canonical weight tables for each scoring mode.
Invariant: weights in each mode must sum to 100.
"""

RESUME_ONLY_WEIGHTS: dict[str, int] = {
    "parseability": 30,
    "structure": 30,
    "content_quality": 40,
    "jd_match": 0,
}

RESUME_AND_JD_WEIGHTS: dict[str, int] = {
    "parseability": 20,
    "structure": 20,
    "content_quality": 20,
    "jd_match": 40,
}


def get_weights(mode: str) -> dict[str, int]:
    return RESUME_ONLY_WEIGHTS if mode == "resume_only" else RESUME_AND_JD_WEIGHTS
