"""Tests for evaluate_structure.py"""

import pytest
from ..parsing.parse_resume import build_resume_from_text
from ..rules.evaluators.evaluate_structure import evaluate_structure


FULL_RESUME = """
Jane Smith
jane@example.com
555-999-0000

Summary
Experienced engineer.

Experience
Senior Engineer — Acme Corp
Jan 2020 - Present
- Built microservices reducing latency by 40%
- Led 5 engineers
- Deployed weekly

Engineer — StartupXYZ
Jun 2018 - Dec 2019
- Built React app with 50K users
- Shipped 15 features

Education
MIT
B.S. Computer Science, 2018

Skills
Python, React, AWS, Docker
""".strip()


def test_no_struct_violations_on_complete_resume():
    resume = build_resume_from_text(FULL_RESUME)
    result = evaluate_structure(resume)
    critical_ids = {v.rule_id for v in result.violations if v.severity == "critical"}
    assert "STRUCT_001" not in critical_ids
    assert "STRUCT_002" not in critical_ids


def test_struct_001_fires_when_no_experience():
    text = "John\njohn@example.com\n\nEducation\nMIT\nB.S.\n\nSkills\nPython"
    resume = build_resume_from_text(text)
    result = evaluate_structure(resume)
    rule_ids = {v.rule_id for v in result.violations}
    assert "STRUCT_001" in rule_ids


def test_struct_003_fires_when_no_skills():
    text = "John\njohn@example.com\n\nExperience\nEngineer at Acme\nJan 2020-Present\n- Built stuff\n\nEducation\nMIT"
    resume = build_resume_from_text(text)
    result = evaluate_structure(resume)
    rule_ids = {v.rule_id for v in result.violations}
    assert "STRUCT_003" in rule_ids


def test_struct_012_fires_on_missing_summary():
    text = "John\njohn@example.com\n\nExperience\nEngineer\nJan 2020-Present\n- Built stuff\n\nSkills\nPython"
    resume = build_resume_from_text(text)
    result = evaluate_structure(resume)
    rule_ids = {v.rule_id for v in result.violations}
    assert "STRUCT_012" in rule_ids


def test_category_is_structure():
    resume = build_resume_from_text(FULL_RESUME)
    result = evaluate_structure(resume)
    assert result.category == "structure"


def test_cap_applied_on_missing_experience():
    text = "John\njohn@example.com\n\nEducation\nMIT"
    resume = build_resume_from_text(text)
    result = evaluate_structure(resume)
    # STRUCT_001 is a cap rule with capValue=40
    if any(v.rule_id == "STRUCT_001" for v in result.violations):
        assert result.cap is not None
        assert result.cap <= 40
