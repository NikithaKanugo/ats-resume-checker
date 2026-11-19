"""Tests for scoring utilities."""

import pytest
from ..scoring.weights import get_weights, RESUME_ONLY_WEIGHTS, RESUME_AND_JD_WEIGHTS
from ..scoring.apply_caps import apply_score_cap, resolve_applied_cap
from ..scoring.compute_overall_score import compute_overall_score, score_to_grade
from ..models.analysis import CategoryScore


def test_resume_only_weights_sum_to_100():
    total = sum(RESUME_ONLY_WEIGHTS.values())
    assert total == 100


def test_resume_and_jd_weights_sum_to_100():
    total = sum(RESUME_AND_JD_WEIGHTS.values())
    assert total == 100


def test_get_weights_resume_only():
    w = get_weights("resume_only")
    assert w["content_quality"] == 40
    assert w["jd_match"] == 0


def test_get_weights_resume_and_jd():
    w = get_weights("resume_and_jd")
    assert w["jd_match"] == 40


def test_apply_score_cap_no_cap():
    assert apply_score_cap(80, None) == 80


def test_apply_score_cap_binding():
    assert apply_score_cap(80, 40) == 40


def test_apply_score_cap_not_binding():
    assert apply_score_cap(30, 40) == 30


def test_resolve_applied_cap_binding():
    assert resolve_applied_cap(80, 40) == 40


def test_resolve_applied_cap_not_binding():
    assert resolve_applied_cap(30, 40) is None


def test_resolve_applied_cap_no_cap():
    assert resolve_applied_cap(80, None) is None


def test_compute_overall_score_sums_weighted():
    subscores = [
        CategoryScore(category="parseability", raw_score=80, weight=30, weighted_score=24.0),
        CategoryScore(category="structure", raw_score=70, weight=30, weighted_score=21.0),
        CategoryScore(category="content_quality", raw_score=60, weight=40, weighted_score=24.0),
    ]
    score = compute_overall_score(subscores)
    assert score == 69.0


def test_compute_overall_score_clamped_to_100():
    subscores = [
        CategoryScore(category="parseability", raw_score=100, weight=100, weighted_score=100.0),
    ]
    assert compute_overall_score(subscores) == 100.0


def test_score_to_grade_excellent():
    assert score_to_grade(90)["label"] == "Excellent"


def test_score_to_grade_good():
    assert score_to_grade(72)["label"] == "Good"


def test_score_to_grade_fair():
    assert score_to_grade(57)["label"] == "Fair"


def test_score_to_grade_weak():
    assert score_to_grade(42)["label"] == "Weak"


def test_score_to_grade_poor():
    assert score_to_grade(20)["label"] == "Poor"
