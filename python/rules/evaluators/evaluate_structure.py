"""
evaluate_structure.py

Evaluates resume organization: section presence, entry completeness, date coverage.
"""

from __future__ import annotations
import math
from typing import Optional
from ...models.resume import Resume
from ...models.rules import RuleDefinition, RuleViolation, EvaluatorResult
from ..definitions.structure_rules import STRUCTURE_RULES_MAP
from ..helpers.section_helpers import (
    has_experience_section, has_education_section, has_skills_section,
    has_summary_section, compute_experience_stats, compute_education_stats,
    estimate_page_count,
)
from .build_result import build_violation, build_evaluator_result


def _pl(count: int, singular: str, plural: str) -> str:
    return singular if count == 1 else plural


def evaluate_structure(resume: Resume) -> EvaluatorResult:
    violations: list[RuleViolation] = []
    cap_rules: list[RuleDefinition] = []

    detected = resume.parse_metadata.detected_sections
    is_low_confidence = resume.parse_metadata.parse_confidence == "low"

    def check(
        rule_id: str,
        condition: bool,
        message: str,
        section: Optional[str] = None,
    ) -> None:
        if not condition:
            return
        rule = STRUCTURE_RULES_MAP[rule_id]
        violations.append(build_violation(rule, message, section))
        if rule.is_cap:
            cap_rules.append(rule)

    def soft_check(
        rule_id: str,
        condition: bool,
        message: str,
        section: Optional[str] = None,
    ) -> None:
        if not condition:
            return
        rule = STRUCTURE_RULES_MAP[rule_id]
        v = build_violation(rule, message, section)
        v.penalty = rule.score_impact // 2
        violations.append(v)

    exp_stats = compute_experience_stats(resume, 2)
    edu_stats = compute_education_stats(resume)

    # ── Required sections ────────────────────────────────────────────────────
    exp_detected = "experience" in detected
    exp_present = has_experience_section(resume)

    if not exp_present and not exp_detected:
        check("STRUCT_001", True,
              "No experience section was detected. This is the most critical section for ATS evaluation.",
              section="experience")
    elif not exp_present and exp_detected:
        soft_check("STRUCT_001", True,
                   "An experience section header was detected but no entries could be extracted.",
                   section="experience")

    edu_detected = "education" in detected
    edu_present = has_education_section(resume)

    if not edu_present and not edu_detected:
        check("STRUCT_002", True,
              "No education section was detected. Many job postings filter candidates by education level.",
              section="education")
    elif not edu_present and edu_detected:
        soft_check("STRUCT_002", True,
                   "An education section header was detected but no entries could be extracted.",
                   section="education")

    skills_detected = "skills" in detected
    skills_present = has_skills_section(resume)

    if not skills_present and not skills_detected:
        check("STRUCT_003", True,
              "No skills section was detected. ATS systems depend heavily on skills keywords.",
              section="skills")
    elif not skills_present and skills_detected:
        soft_check("STRUCT_003", True,
                   "A skills section header was detected but no skills could be extracted.",
                   section="skills")

    # ── Experience entry completeness ────────────────────────────────────────
    if not is_low_confidence:
        if exp_stats.missing_titles:
            n = len(exp_stats.missing_titles)
            check("STRUCT_004", True,
                  f"{n} experience {_pl(n,'entry','entries')} {_pl(n,'is','are')} missing a job title.",
                  section=f"experience.{exp_stats.missing_titles[0]}")

        if exp_stats.missing_company:
            n = len(exp_stats.missing_company)
            check("STRUCT_005", True,
                  f"{n} experience {_pl(n,'entry','entries')} {_pl(n,'is','are')} missing a company name.",
                  section=f"experience.{exp_stats.missing_company[0]}")

        if exp_stats.missing_dates:
            n = len(exp_stats.missing_dates)
            check("STRUCT_006", True,
                  f"{n} experience {_pl(n,'entry','entries')} {_pl(n,'is','are')} missing start or end dates.",
                  section=f"experience.{exp_stats.missing_dates[0]}")

        if exp_stats.missing_bullets:
            n = len(exp_stats.missing_bullets)
            check("STRUCT_007", True,
                  f"{n} experience {_pl(n,'entry','entries')} contain no bullet points.",
                  section=f"experience.{exp_stats.missing_bullets[0]}")

        if exp_stats.too_few_bullets:
            n = len(exp_stats.too_few_bullets)
            check("STRUCT_008", True,
                  f"{n} experience {_pl(n,'entry','entries')} {_pl(n,'has','have')} fewer than 2 bullet points.",
                  section=f"experience.{exp_stats.too_few_bullets[0]}.bullets")

    # ── Education entry completeness ────────────────────────────────────────
    if not is_low_confidence:
        if edu_stats.missing_institution:
            n = len(edu_stats.missing_institution)
            check("STRUCT_009", True,
                  f"{n} education {_pl(n,'entry','entries')} {_pl(n,'is','are')} missing an institution name.",
                  section=f"education.{edu_stats.missing_institution[0]}")

        if edu_stats.missing_degree:
            n = len(edu_stats.missing_degree)
            check("STRUCT_010", True,
                  f"{n} education {_pl(n,'entry','entries')} {_pl(n,'is','are')} missing a degree.",
                  section=f"education.{edu_stats.missing_degree[0]}")

    # ── Document shape ────────────────────────────────────────────────────────
    estimated_pages = estimate_page_count(resume)
    check("STRUCT_011", estimated_pages > 2,
          f"The resume is estimated at ~{estimated_pages} pages. Most ATS systems prefer 1-2 pages.")

    check("STRUCT_012", not has_summary_section(resume),
          "No professional summary was detected. A summary helps recruiters and ATS systems quickly qualify candidates.",
          section="summary")

    check("STRUCT_013", len(resume.experience) == 1,
          "Only one job is listed. Ensure this single entry is presented with full title, company, dates, and detailed bullets.",
          section="experience.0")

    return build_evaluator_result("structure", violations, cap_rules)
