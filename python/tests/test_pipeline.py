"""Integration tests for the full analysis pipeline."""

import pytest
from ..orchestrators.run_resume_only_analysis import (
    run_resume_only_analysis_from_text,
)


GOOD_RESUME = """
Alex Johnson
alex@example.com
(555) 123-4567
linkedin.com/in/alexjohnson
github.com/alexjohnson

Summary
Full-stack engineer with 6 years building scalable web applications.

Experience
Staff Engineer — BigCo Inc
March 2021 - Present
- Architected event-driven system processing 50M messages/day
- Reduced infrastructure cost by 35% through right-sizing
- Led 8-engineer team delivering 3 major product initiatives
- Improved test coverage from 40% to 92%

Senior Engineer — MediumCo
January 2019 - February 2021
- Built React dashboard serving 200K daily active users
- Reduced page load time by 60% through CDN and code splitting
- Engineered GraphQL API adopted across 4 product teams

Software Engineer — SmallStartup
June 2017 - December 2018
- Developed Python microservices with FastAPI and PostgreSQL
- Implemented CI/CD pipeline reducing deployment time by 70%

Education
University of California, Berkeley
B.S. Electrical Engineering and Computer Science, 2017

Skills
Python, TypeScript, React, Node.js, GraphQL, AWS, GCP, Docker, Kubernetes,
PostgreSQL, Redis, Terraform, Git, Linux
""".strip()


MINIMAL_RESUME = "John\njohn@example.com"


def test_pipeline_returns_analysis_result():
    result = run_resume_only_analysis_from_text(GOOD_RESUME)
    assert result.analysis_id
    assert result.created_at
    assert result.scoring_mode == "resume_only"


def test_good_resume_scores_above_50():
    result = run_resume_only_analysis_from_text(GOOD_RESUME)
    assert result.overall_score > 50


def test_minimal_resume_scores_low():
    result = run_resume_only_analysis_from_text(MINIMAL_RESUME)
    assert result.overall_score < 50


def test_subscores_sum_to_overall():
    result = run_resume_only_analysis_from_text(GOOD_RESUME)
    expected = round(sum(s.weighted_score for s in result.subscores), 1)
    assert abs(result.overall_score - expected) < 0.5


def test_priority_fixes_at_most_5():
    result = run_resume_only_analysis_from_text(GOOD_RESUME)
    assert len(result.priority_fixes) <= 5


def test_priority_fixes_ranked_1_through_n():
    result = run_resume_only_analysis_from_text(GOOD_RESUME)
    for i, fix in enumerate(result.priority_fixes, start=1):
        assert fix.rank == i


def test_strengths_at_most_5():
    result = run_resume_only_analysis_from_text(GOOD_RESUME)
    assert len(result.strengths) <= 5


def test_good_resume_has_strengths():
    result = run_resume_only_analysis_from_text(GOOD_RESUME)
    assert len(result.strengths) > 0


def test_parsed_resume_is_included():
    result = run_resume_only_analysis_from_text(GOOD_RESUME)
    assert result.parsed_resume is not None
    assert result.parsed_resume.raw_text


def test_metadata_matches_resume():
    result = run_resume_only_analysis_from_text(GOOD_RESUME)
    assert result.metadata.resume_char_count == len(result.parsed_resume.raw_text)


def test_overall_score_bounded_0_100():
    result = run_resume_only_analysis_from_text(GOOD_RESUME)
    assert 0 <= result.overall_score <= 100


def test_weights_sum_to_100_via_subscores():
    result = run_resume_only_analysis_from_text(GOOD_RESUME)
    total_weight = sum(s.weight for s in result.subscores)
    assert total_weight == 100


def test_issues_all_have_valid_categories():
    result = run_resume_only_analysis_from_text(GOOD_RESUME)
    valid = {"parseability", "structure", "content_quality", "jd_match"}
    for issue in result.issues:
        assert issue.category in valid


def test_issues_all_have_valid_severities():
    result = run_resume_only_analysis_from_text(GOOD_RESUME)
    valid = {"critical", "high", "medium", "low"}
    for issue in result.issues:
        assert issue.severity in valid
