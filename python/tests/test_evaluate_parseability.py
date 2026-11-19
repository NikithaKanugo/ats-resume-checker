"""Tests for evaluate_parseability.py"""

import pytest
from ..parsing.parse_resume import build_resume_from_text
from ..rules.evaluators.evaluate_parseability import evaluate_parseability


GOOD_RESUME = """
John Doe
john@example.com
555-111-2222
linkedin.com/in/johndoe

Experience
Software Engineer at Acme
Jan 2020 - Present
- Built things
- Did stuff and improved performance by 30%
- Led team of engineers
- Deployed to production weekly

Education
B.S. MIT 2020

Skills
Python, React, AWS
""" * 5  # repeat to get enough words


def test_no_violations_on_good_resume():
    resume = build_resume_from_text(GOOD_RESUME)
    result = evaluate_parseability(resume)
    rule_ids = {v.rule_id for v in result.violations}
    # A good resume shouldn't trigger critical parse rules
    assert "PARSE_001" not in rule_ids
    assert "PARSE_006" not in rule_ids


def test_parse_001_fires_on_very_short_text():
    resume = build_resume_from_text("hi")
    result = evaluate_parseability(resume)
    rule_ids = {v.rule_id for v in result.violations}
    assert "PARSE_001" in rule_ids


def test_parse_004_fires_on_missing_email():
    text = "John Doe\n555-111-2222\n\nExperience\nJob\n\nSkills\nPython"
    resume = build_resume_from_text(text)
    result = evaluate_parseability(resume)
    rule_ids = {v.rule_id for v in result.violations}
    assert "PARSE_004" in rule_ids


def test_parse_005_fires_on_missing_phone():
    text = "John Doe\njohn@example.com\n\nExperience\nJob\n\nSkills\nPython"
    resume = build_resume_from_text(text)
    result = evaluate_parseability(resume)
    rule_ids = {v.rule_id for v in result.violations}
    assert "PARSE_005" in rule_ids


def test_parse_009_fires_on_no_socials():
    text = (
        "John Doe\njohn@example.com\n555-111-2222\n\n"
        "Experience\nSoftware Engineer at Acme\nJan 2020 - Present\n"
        "- Built things\n\nSkills\nPython"
    )
    resume = build_resume_from_text(text)
    result = evaluate_parseability(resume)
    rule_ids = {v.rule_id for v in result.violations}
    assert "PARSE_009" in rule_ids


def test_category_is_parseability():
    resume = build_resume_from_text("x")
    result = evaluate_parseability(resume)
    assert result.category == "parseability"


def test_total_penalty_is_sum_of_violations():
    resume = build_resume_from_text("x")
    result = evaluate_parseability(resume)
    assert result.total_penalty == sum(v.penalty for v in result.violations)
