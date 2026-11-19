"""Tests for evaluate_content_quality.py"""

import pytest
from ..parsing.parse_resume import build_resume_from_text
from ..rules.evaluators.evaluate_content_quality import evaluate_content_quality


STRONG_RESUME = """
Jane Smith
jane@example.com
555-000-1111

Experience
Senior Engineer — Acme
Jan 2020 - Present
- Reduced API latency by 40% through caching
- Architected microservices handling 10M requests/day
- Deployed 20 features across 3 quarters, increasing revenue by $500K
- Engineered CI/CD pipeline cutting release cycle from 2 weeks to 2 days
- Mentored 4 junior engineers

Skills
Python, TypeScript, React, AWS, Docker, Kubernetes, PostgreSQL, Redis
""".strip()


WEAK_RESUME = """
Jane Smith
jane@example.com

Experience
Engineer
- Helped with projects
- Assisted the team
- Worked on various tasks
- Supported development activities

Skills
Communication, Teamwork
""".strip()


def test_strong_resume_fewer_violations():
    resume = build_resume_from_text(STRONG_RESUME)
    result = evaluate_content_quality(resume)
    strong_rule_ids = {v.rule_id for v in result.violations}
    # Should not fire critical content rules
    assert "CONTENT_003" not in strong_rule_ids


def test_content_002_fires_on_weak_verbs():
    resume = build_resume_from_text(WEAK_RESUME)
    result = evaluate_content_quality(resume)
    rule_ids = {v.rule_id for v in result.violations}
    assert "CONTENT_002" in rule_ids


def test_content_011_fires_on_soft_skills_only():
    resume = build_resume_from_text(WEAK_RESUME)
    result = evaluate_content_quality(resume)
    rule_ids = {v.rule_id for v in result.violations}
    assert "CONTENT_011" in rule_ids


def test_content_007_fires_on_first_person():
    text = "Jane\njane@example.com\n\nExperience\nI worked on a team\n- I built things\n\nSkills\nPython"
    resume = build_resume_from_text(text)
    result = evaluate_content_quality(resume)
    rule_ids = {v.rule_id for v in result.violations}
    assert "CONTENT_007" in rule_ids


def test_content_008_fires_on_cliches():
    text = (
        "Jane\njane@example.com\n\nExperience\nEngineer at Acme\n2020-Present\n"
        "- I am a team player who is detail-oriented\n- Results-driven professional\n\nSkills\nPython"
    )
    resume = build_resume_from_text(text)
    result = evaluate_content_quality(resume)
    rule_ids = {v.rule_id for v in result.violations}
    assert "CONTENT_008" in rule_ids


def test_category_is_content_quality():
    resume = build_resume_from_text(STRONG_RESUME)
    result = evaluate_content_quality(resume)
    assert result.category == "content_quality"


def test_no_cap_on_content_quality():
    resume = build_resume_from_text(WEAK_RESUME)
    result = evaluate_content_quality(resume)
    # Content quality rules don't have caps
    assert result.cap is None
