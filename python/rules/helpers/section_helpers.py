"""
section_helpers.py

Pure functions for checking section presence, completeness, and employment gaps.
"""

from __future__ import annotations
import re
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

from ...models.resume import Resume


# ---------------------------------------------------------------------------
# Section presence
# ---------------------------------------------------------------------------

def has_experience_section(resume: Resume) -> bool:
    return len(resume.experience) > 0


def has_education_section(resume: Resume) -> bool:
    return len(resume.education) > 0


def has_skills_section(resume: Resume) -> bool:
    return len(resume.skills.raw_list) > 0


def has_summary_section(resume: Resume) -> bool:
    return bool(resume.summary and resume.summary.strip())


# ---------------------------------------------------------------------------
# Experience entry completeness
# ---------------------------------------------------------------------------

@dataclass
class ExperienceStats:
    missing_titles: list[int] = field(default_factory=list)
    missing_company: list[int] = field(default_factory=list)
    missing_dates: list[int] = field(default_factory=list)
    missing_bullets: list[int] = field(default_factory=list)
    too_few_bullets: list[int] = field(default_factory=list)


def compute_experience_stats(resume: Resume, min_bullets: int = 2) -> ExperienceStats:
    stats = ExperienceStats()
    for i, e in enumerate(resume.experience):
        has_title = bool(e.title and e.title.strip())
        has_company = bool(e.company and e.company.strip())
        if not has_title:
            stats.missing_titles.append(i)
        if not has_company and has_title and e.bullets:
            stats.missing_company.append(i)
        if not e.start_date and not e.end_date and not e.is_current and has_title and has_company:
            stats.missing_dates.append(i)
        if not e.bullets:
            stats.missing_bullets.append(i)
        elif len(e.bullets) < min_bullets:
            stats.too_few_bullets.append(i)
    return stats


# ---------------------------------------------------------------------------
# Education entry completeness
# ---------------------------------------------------------------------------

@dataclass
class EducationStats:
    missing_institution: list[int] = field(default_factory=list)
    missing_degree: list[int] = field(default_factory=list)


def compute_education_stats(resume: Resume) -> EducationStats:
    stats = EducationStats()
    for i, e in enumerate(resume.education):
        if not (e.institution and e.institution.strip()):
            stats.missing_institution.append(i)
        if not (e.degree and e.degree.strip()):
            stats.missing_degree.append(i)
    return stats


# ---------------------------------------------------------------------------
# Document shape
# ---------------------------------------------------------------------------

def estimate_page_count(resume: Resume) -> int:
    return max(1, -(-len(resume.raw_text) // 3000))  # ceiling division


def count_words(text: str) -> int:
    return len([w for w in text.strip().split() if w])


# ---------------------------------------------------------------------------
# Employment gap detection
# ---------------------------------------------------------------------------

def has_employment_gap(resume: Resume, threshold_months: int = 6) -> bool:
    dated = []
    for e in resume.experience:
        if e.start_date and (e.end_date or e.is_current):
            start = _parse_approximate_date(e.start_date)
            end = date.today() if e.is_current else _parse_approximate_date(e.end_date or "")
            if start and end:
                dated.append((start, end))

    # Sort newest first
    dated.sort(key=lambda x: x[0], reverse=True)

    for i in range(len(dated) - 1):
        _, prev_end = dated[i + 1]
        curr_start, _ = dated[i]
        if prev_end and curr_start:
            gap = _months_between(prev_end, curr_start)
            if gap > threshold_months:
                return True

    return False


# ---------------------------------------------------------------------------
# Language checks
# ---------------------------------------------------------------------------

FIRST_PERSON_RE = re.compile(r"\b(I|my|me|we|our)\b")

CLICHE_PHRASES: list[str] = [
    "team player", "self-motivated", "self motivated", "detail-oriented",
    "detail oriented", "hard worker", "hard-working", "think outside the box",
    "go-getter", "go getter", "results-driven", "results driven",
    "dynamic professional", "proactive", "synergy", "leverage",
    "passionate about", "proven track record",
]


def contains_first_person_pronouns(text: str) -> bool:
    return bool(FIRST_PERSON_RE.search(text))


def contains_cliche_phrases(text: str) -> bool:
    lower = text.lower()
    return any(phrase in lower for phrase in CLICHE_PHRASES)


# ---------------------------------------------------------------------------
# Date utilities
# ---------------------------------------------------------------------------

def _parse_approximate_date(raw: str) -> Optional[date]:
    if not raw:
        return None
    s = raw.strip()

    # "Jan 2021"
    m = re.match(
        r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})$",
        s, re.I,
    )
    if m:
        from datetime import datetime
        try:
            return datetime.strptime(f"{m.group(1)[:3]} 1 {m.group(2)}", "%b %d %Y").date()
        except ValueError:
            pass

    # "12/2024"
    m = re.match(r"^(\d{1,2})/(\d{4})$", s)
    if m:
        return date(int(m.group(2)), int(m.group(1)), 1)

    # "12/24"
    m = re.match(r"^(\d{1,2})/(\d{2})$", s)
    if m:
        return date(2000 + int(m.group(2)), int(m.group(1)), 1)

    # "2021"
    m = re.match(r"^(\d{4})$", s)
    if m:
        return date(int(m.group(1)), 1, 1)

    return None


def _months_between(earlier: date, later: date) -> int:
    return (later.year - earlier.year) * 12 + (later.month - earlier.month)
