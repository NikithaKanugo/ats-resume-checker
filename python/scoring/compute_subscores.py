"""
compute_subscores.py

Converts raw EvaluatorResults into weighted CategoryScores.
"""

from __future__ import annotations
from ..models.rules import EvaluatorResult
from ..models.analysis import CategoryScore
from .weights import get_weights
from .apply_caps import apply_score_cap, resolve_applied_cap


def _round2(n: float) -> float:
    return round(n * 100) / 100


def compute_subscores(results: list[EvaluatorResult], mode: str) -> list[CategoryScore]:
    weights = get_weights(mode)
    by_category = {r.category: r for r in results}
    subscores: list[CategoryScore] = []

    for category, weight in weights.items():
        if weight == 0:
            continue

        result = by_category.get(category)
        if result is None:
            subscores.append(CategoryScore(
                category=category,
                raw_score=100,
                weight=weight,
                weighted_score=float(weight),
                cap_applied=None,
            ))
            continue

        raw_score = max(0.0, 100.0 - result.total_penalty)
        capped_score = apply_score_cap(raw_score, result.cap)
        cap_applied = resolve_applied_cap(raw_score, result.cap)
        weighted_score = _round2((capped_score / 100) * weight)

        subscores.append(CategoryScore(
            category=category,
            raw_score=_round2(raw_score),
            weight=weight,
            weighted_score=weighted_score,
            cap_applied=cap_applied,
        ))

    return subscores
