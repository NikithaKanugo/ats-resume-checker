"""
apply_caps.py — Apply hard score ceilings.
"""

from typing import Optional


def apply_score_cap(raw_score: float, cap: Optional[int]) -> float:
    if cap is None:
        return raw_score
    return min(raw_score, cap)


def resolve_applied_cap(raw_score: float, cap: Optional[int]) -> Optional[int]:
    if cap is None:
        return None
    return cap if raw_score > cap else None
