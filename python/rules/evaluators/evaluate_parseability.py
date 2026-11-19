"""
evaluate_parseability.py

Evaluates whether the resume can be reliably parsed by an ATS system.
"""

from __future__ import annotations
from typing import Optional
from ...models.resume import Resume
from ...models.rules import RuleDefinition, RuleViolation, EvaluatorResult
from ..definitions.parseability_rules import PARSEABILITY_RULES_MAP
from ..helpers.section_helpers import count_words
from .build_result import build_violation, build_evaluator_result


def evaluate_parseability(resume: Resume) -> EvaluatorResult:
    violations: list[RuleViolation] = []
    cap_rules: list[RuleDefinition] = []

    def check(
        rule_id: str,
        condition: bool,
        message: str,
        section: Optional[str] = None,
        text: Optional[str] = None,
    ) -> None:
        if not condition:
            return
        rule = PARSEABILITY_RULES_MAP[rule_id]
        violations.append(build_violation(rule, message, section, text))
        if rule.is_cap:
            cap_rules.append(rule)

    contact = resume.contact
    raw_text = resume.raw_text
    meta = resume.parse_metadata

    # PARSE_001: Resume too short
    check(
        "PARSE_001",
        len(raw_text) < 100,
        f"Extracted text is only {len(raw_text)} characters. The file may be image-based, password-protected, or empty.",
    )

    # PARSE_006: No section headers
    check(
        "PARSE_006",
        len(meta.detected_sections) == 0,
        "No section headers were detected. The resume appears to have no standard structure (Experience, Education, Skills, etc.).",
    )

    # PARSE_002: Low parse confidence
    check(
        "PARSE_002",
        meta.parse_confidence == "low",
        "The parser assigned low confidence to this resume. Key sections may be missing or unreadable.",
    )

    # PARSE_003: No contact information at all
    has_any_contact = bool(contact.name or contact.email or contact.phone)
    check(
        "PARSE_003",
        not has_any_contact,
        "No contact information (name, email, or phone) was detected in the resume.",
        section="contact",
    )

    # PARSE_004: Missing email
    check(
        "PARSE_004",
        not contact.email,
        "No valid email address was found. Email is a required contact field for ATS systems.",
        section="contact",
    )

    # PARSE_005: Missing phone
    check(
        "PARSE_005",
        not contact.phone,
        "No phone number was detected. Most recruiters and ATS systems expect a phone number.",
        section="contact",
    )

    # PARSE_007: Insufficient word count
    word_count = count_words(raw_text)
    check(
        "PARSE_007",
        word_count < 300,
        f"The resume contains only {word_count} words. A substantive resume should have at least 400–600 words.",
    )

    # PARSE_008: Candidate name missing
    check(
        "PARSE_008",
        not contact.name,
        "No candidate name was detected at the top of the resume.",
        section="contact",
    )

    # PARSE_009: No LinkedIn or GitHub
    check(
        "PARSE_009",
        not contact.linkedin and not contact.github,
        "No LinkedIn or GitHub profile URL was found. These improve recruiter confidence and ATS profile completeness.",
        section="contact",
    )

    return build_evaluator_result("parseability", violations, cap_rules)
