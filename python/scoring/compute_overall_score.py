"""
compute_overall_score.py

Derives the final overall score from computed subscores.
Formula: overall = Σ weighted_score
"""

from __future__ import annotations
from ..models.analysis import CategoryScore


def compute_overall_score(subscores: list[CategoryScore]) -> float:
    raw = sum(s.weighted_score for s in subscores)
    return _clamp(_round1(raw), 0, 100)


def score_to_grade(score: float) -> dict[str, str]:
    if score >= 85:
        return {"label": "Excellent", "description": "Highly competitive for ATS screening."}
    if score >= 70:
        return {"label": "Good", "description": "Likely to pass ATS screening with minor improvements."}
    if score >= 55:
        return {"label": "Fair", "description": "May pass ATS screening but needs targeted improvements."}
    if score >= 40:
        return {"label": "Weak", "description": "Likely to be filtered out. Significant improvements needed."}
    return {"label": "Poor", "description": "High risk of ATS rejection. Major revisions required."}


def _round1(n: float) -> float:
    return round(n * 10) / 10


def _clamp(n: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, n))
