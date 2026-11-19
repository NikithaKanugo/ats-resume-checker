"""
evaluate_content_quality.py

Evaluates the impact and quality of resume content.
"""

from __future__ import annotations
import re
from functools import lru_cache
from typing import Optional
from ...models.resume import Resume
from ...models.rules import RuleViolation, EvaluatorResult
from ..definitions.content_quality_rules import CONTENT_QUALITY_RULES_MAP
from ..helpers.bullet_helpers import (
    get_indexed_bullets,
    count_quantified_bullets, is_quantified,
    count_weak_verbs, starts_with_weak_verb,
    count_action_verb_bullets,
    count_responsibility_bullets, starts_with_responsibility_phrase,
    count_long_bullets, count_short_bullets,
)
from ..helpers.section_helpers import (
    contains_first_person_pronouns, contains_cliche_phrases, has_employment_gap,
)
from .build_result import build_violation, build_evaluator_result


TECHNICAL_SKILL_SIGNALS: list[str] = [
    # Languages
    "javascript", "typescript", "python", "java", "go", "rust", "c++", "c#",
    "ruby", "swift", "kotlin", "scala", "php", "r", "sql",
    # Frameworks
    "react", "next", "vue", "angular", "node", "rails", "django", "spring",
    "express", "fastapi", "laravel",
    # Cloud / infra
    "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ci/cd",
    # Databases
    "postgres", "mysql", "mongodb", "redis", "elasticsearch",
    # Tools
    "git", "github", "linux", "bash",
]


@lru_cache(maxsize=256)
def _is_technical_skill(skill: str) -> bool:
    lower = skill.lower().strip()
    for signal in TECHNICAL_SKILL_SIGNALS:
        # Use word-boundary matching to avoid "r" matching inside "Communication"
        if re.search(r"(?<![a-z])" + re.escape(signal) + r"(?![a-z])", lower):
            return True
    return False


def evaluate_content_quality(resume: Resume) -> EvaluatorResult:
    violations: list[RuleViolation] = []

    def check(
        rule_id: str,
        condition: bool,
        message: str,
        section: Optional[str] = None,
        text: Optional[str] = None,
    ) -> None:
        if not condition:
            return
        violations.append(
            build_violation(CONTENT_QUALITY_RULES_MAP[rule_id], message, section, text)
        )

    indexed = get_indexed_bullets(resume)
    bullets = [b.text for b in indexed]
    total_bullets = len(bullets)

    has_experience_text = any(
        len(e.raw_text.strip()) > 50 for e in resume.experience
    )
    zero_bullet_risk = has_experience_text and total_bullets == 0
    low_bullet_risk = 0 < total_bullets < 3
    has_enough_bullets = total_bullets >= 3

    # CONTENT_006: Too few total bullets
    check(
        "CONTENT_006",
        total_bullets < 6,
        f"Only {total_bullets} bullet {'point' if total_bullets == 1 else 'points'} found across all experience entries.",
        section="experience",
    )

    # Zero-bullet penalty floor
    if zero_bullet_risk:
        check("CONTENT_003", True,
              "No structured bullet content was extracted from experience entries.",
              section="experience")
        check("CONTENT_001", True,
              "0% of experience content contains measurable results.",
              section="experience")

    # Action verbs
    if not zero_bullet_risk:
        action_verb_count = count_action_verb_bullets(bullets)
        if total_bullets > 0 and action_verb_count == 0:
            first = indexed[0] if indexed else None
            check("CONTENT_003", True,
                  "No bullets begin with a recognized action verb.",
                  section=f"experience.{first.entry_index}.bullets" if first else "experience",
                  text=first.text if first else None)

    # CONTENT_001: Too few quantified achievements
    if not zero_bullet_risk and (has_enough_bullets or low_bullet_risk):
        quantified_count = count_quantified_bullets(bullets)
        ratio = quantified_count / total_bullets if total_bullets > 0 else 0
        threshold = 0.25 if has_enough_bullets else 0
        first_unquantified = next((b for b in indexed if not is_quantified(b.text)), None)
        check(
            "CONTENT_001",
            ratio <= threshold,
            (
                f"Only {round(ratio * 100)}% of bullets contain measurable results. Aim for 25–40%."
                if has_enough_bullets
                else f"None of the {total_bullets} bullet {'point' if total_bullets == 1 else 'points'} contain measurable results."
            ),
            section=f"experience.{first_unquantified.entry_index}.bullets" if first_unquantified else None,
            text=first_unquantified.text if first_unquantified else None,
        )

    # CONTENT_002: Excessive weak verbs
    if has_enough_bullets or low_bullet_risk:
        weak_count = count_weak_verbs(bullets)
        weak_ratio = weak_count / total_bullets if total_bullets > 0 else 0
        threshold = 0.3 if has_enough_bullets else 0.5
        first_weak = next((b for b in indexed if starts_with_weak_verb(b.text)), None)
        check(
            "CONTENT_002",
            weak_ratio > threshold,
            f'{round(weak_ratio * 100)}% of bullets start with weak or passive verbs.',
            section=f"experience.{first_weak.entry_index}.bullets" if first_weak else None,
            text=first_weak.text if first_weak else None,
        )

    # CONTENT_009: Responsibility-focused language
    if has_enough_bullets or low_bullet_risk:
        resp_count = count_responsibility_bullets(bullets)
        resp_ratio = resp_count / total_bullets if total_bullets > 0 else 0
        threshold = 0.3 if has_enough_bullets else 0.5
        first_resp = next((b for b in indexed if starts_with_responsibility_phrase(b.text)), None)
        check(
            "CONTENT_009",
            resp_ratio > threshold,
            f"{round(resp_ratio * 100)}% of bullets describe responsibilities rather than achievements.",
            section=f"experience.{first_resp.entry_index}.bullets" if first_resp else None,
            text=first_resp.text if first_resp else None,
        )

    # CONTENT_004: Bullets too long
    if has_enough_bullets or low_bullet_risk:
        long_count = count_long_bullets(bullets, 200)
        long_ratio = long_count / total_bullets if total_bullets > 0 else 0
        threshold = 0.3 if has_enough_bullets else 0.5
        first_long = next((b for b in indexed if len(b.text) > 200), None)
        check(
            "CONTENT_004",
            long_ratio > threshold,
            f"{long_count} {'bullet' if long_count == 1 else 'bullets'} exceed 200 characters.",
            section=f"experience.{first_long.entry_index}.bullets" if first_long else None,
            text=first_long.text if first_long else None,
        )

    # CONTENT_005: Bullets too short
    if has_enough_bullets or low_bullet_risk:
        short_count = count_short_bullets(bullets, 40)
        short_ratio = short_count / total_bullets if total_bullets > 0 else 0
        threshold = 0.3 if has_enough_bullets else 0.5
        first_short = next((b for b in indexed if len(b.text) < 40), None)
        check(
            "CONTENT_005",
            short_ratio > threshold,
            f"{short_count} {'bullet' if short_count == 1 else 'bullets'} are fewer than 40 characters.",
            section=f"experience.{first_short.entry_index}.bullets" if first_short else None,
            text=first_short.text if first_short else None,
        )

    # Language quality
    check("CONTENT_007", contains_first_person_pronouns(resume.raw_text),
          'First-person pronouns ("I", "my", "me") were detected.')

    check("CONTENT_008", contains_cliche_phrases(resume.raw_text),
          'Overused clichés were detected (e.g., "team player", "detail-oriented").')

    # Skills quality
    skill_count = len(resume.skills.raw_list)
    check("CONTENT_010", 0 < skill_count < 5,
          f"Only {skill_count} {'skill' if skill_count == 1 else 'skills'} listed. A competitive resume lists 8–15.",
          section="skills")

    has_technical = any(_is_technical_skill(s) for s in resume.skills.raw_list)
    check("CONTENT_011", skill_count > 0 and not has_technical,
          "No technical or domain-specific skills were detected.",
          section="skills")

    # Employment gap
    check("CONTENT_012", has_employment_gap(resume, 6),
          "An employment gap of more than 6 months was detected.",
          section="experience")

    return build_evaluator_result("content_quality", violations, [])
