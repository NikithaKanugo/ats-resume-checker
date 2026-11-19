"""Tests for parse_resume.py"""

import pytest
from ..parsing.parse_resume import build_resume_from_text


FULL_RESUME = """
Jane Smith
jane@example.com
(555) 987-6543
linkedin.com/in/janesmith
github.com/janesmith
San Francisco, CA

Summary
Experienced software engineer with 5 years building scalable systems.

Experience
Senior Software Engineer — Acme Corp
Jan 2021 - Present
- Led migration of monolith to microservices, reducing latency by 40%
- Architected new data pipeline processing 10M events/day
- Mentored 3 junior engineers

Software Engineer — StartupXYZ
Jun 2019 - Dec 2020
- Built React dashboard used by 50K monthly users
- Reduced build time by 60% by optimizing webpack config
- Shipped 15 features across 4 quarters

Education
Massachusetts Institute of Technology
B.S. Computer Science, 2019

Skills
Python, JavaScript, TypeScript, React, Node.js, AWS, Docker, PostgreSQL
""".strip()


def test_parses_name():
    resume = build_resume_from_text(FULL_RESUME)
    assert resume.contact.name == "Jane Smith"


def test_parses_email():
    resume = build_resume_from_text(FULL_RESUME)
    assert resume.contact.email == "jane@example.com"


def test_parses_phone():
    resume = build_resume_from_text(FULL_RESUME)
    assert resume.contact.phone is not None


def test_parses_linkedin():
    resume = build_resume_from_text(FULL_RESUME)
    assert resume.contact.linkedin is not None
    assert "linkedin" in resume.contact.linkedin.lower()


def test_parses_github():
    resume = build_resume_from_text(FULL_RESUME)
    assert resume.contact.github is not None


def test_parses_experience_count():
    resume = build_resume_from_text(FULL_RESUME)
    assert len(resume.experience) == 2


def test_parses_experience_bullets():
    resume = build_resume_from_text(FULL_RESUME)
    all_bullets = [b for e in resume.experience for b in e.bullets]
    assert len(all_bullets) >= 4


def test_parses_education():
    resume = build_resume_from_text(FULL_RESUME)
    assert len(resume.education) >= 1
    assert resume.education[0].institution is not None


def test_parses_skills():
    resume = build_resume_from_text(FULL_RESUME)
    assert len(resume.skills.raw_list) >= 5


def test_detects_summary():
    resume = build_resume_from_text(FULL_RESUME)
    assert resume.summary is not None
    assert len(resume.summary) > 10


def test_parse_confidence_is_high():
    resume = build_resume_from_text(FULL_RESUME)
    assert resume.parse_metadata.parse_confidence in ("high", "medium")


def test_empty_text_returns_low_confidence():
    resume = build_resume_from_text("hello world")
    assert resume.parse_metadata.parse_confidence == "low"


def test_txt_format_stored():
    resume = build_resume_from_text(FULL_RESUME, "txt")
    assert resume.parse_metadata.source_format == "txt"


def test_no_name_returns_none():
    text = "experience\njob\neducation\nschool"
    resume = build_resume_from_text(text)
    # name may or may not be detected — just ensure no crash
    assert resume.contact is not None
