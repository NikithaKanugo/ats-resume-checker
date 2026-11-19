"""Tests for detect_sections.py"""

import pytest
from ..parsing.detect_sections import detect_sections


SIMPLE_RESUME = """
John Doe
john@example.com
555-123-4567

Experience
Software Engineer at Acme Corp, 2020 - Present
- Built microservices
- Led team of 5

Education
B.S. Computer Science, MIT, 2020

Skills
Python, JavaScript, React
""".strip()


def test_detects_standard_sections():
    result = detect_sections(SIMPLE_RESUME)
    assert "experience" in result.detected_section_names
    assert "education" in result.detected_section_names
    assert "skills" in result.detected_section_names


def test_contact_is_text_before_first_header():
    result = detect_sections(SIMPLE_RESUME)
    assert "john@example.com" in result.sections.get("contact", "")


def test_no_headers_returns_whole_text_as_contact():
    result = detect_sections("John Doe\njohn@example.com")
    assert result.detected_section_names == []
    assert "John Doe" in result.sections.get("contact", "")
    assert len(result.warnings) > 0


def test_duplicate_section_merges_content():
    text = "Name\nExperience\nJob 1\nExperience\nJob 2"
    result = detect_sections(text)
    assert "experience" in result.sections
    assert any("Duplicate" in w for w in result.warnings)


def test_summary_section_detected():
    text = "Name\nSummary\nI am a developer\nExperience\nJob"
    result = detect_sections(text)
    assert "summary" in result.detected_section_names


def test_missing_experience_adds_warning():
    text = "Name\nEducation\nMIT"
    result = detect_sections(text)
    assert any("experience" in w.lower() for w in result.warnings)
