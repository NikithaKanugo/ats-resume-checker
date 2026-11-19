"""
bullet_helpers.py

Pure functions for extracting and analyzing bullet points across experience entries.
"""

from __future__ import annotations
import re
from dataclasses import dataclass
from ...models.resume import Resume


# ---------------------------------------------------------------------------
# Extraction
# ---------------------------------------------------------------------------

def get_all_bullets(resume: Resume) -> list[str]:
    return [b for entry in resume.experience for b in entry.bullets]


@dataclass
class IndexedBullet:
    text: str
    entry_index: int


def get_indexed_bullets(resume: Resume) -> list[IndexedBullet]:
    result: list[IndexedBullet] = []
    for i, entry in enumerate(resume.experience):
        for text in entry.bullets:
            result.append(IndexedBullet(text=text, entry_index=i))
    return result


# ---------------------------------------------------------------------------
# Quantification
# ---------------------------------------------------------------------------

QUANTIFICATION_RE = re.compile(
    r"\d+%|\$\s*\d|\d+\s*x\b|\d+\s*(million|billion|k\b|thousand)|"
    r"increased|decreased|reduced|grew|saved|generated|\d{2,}",
    re.I,
)


def is_quantified(bullet: str) -> bool:
    return bool(QUANTIFICATION_RE.search(bullet))


def count_quantified_bullets(bullets: list[str]) -> int:
    return sum(1 for b in bullets if is_quantified(b))


# ---------------------------------------------------------------------------
# Weak verbs
# ---------------------------------------------------------------------------

WEAK_VERBS: frozenset[str] = frozenset([
    "helped", "assisted", "supported", "worked", "participated",
    "involved", "responsible", "handled", "tasked", "assigned",
    "performed", "did", "made", "used", "utilized", "employed",
    "served", "contributed",
])


def starts_with_weak_verb(bullet: str) -> bool:
    first_word = bullet.strip().split()[0].lower() if bullet.strip() else ""
    return first_word in WEAK_VERBS


def count_weak_verbs(bullets: list[str]) -> int:
    return sum(1 for b in bullets if starts_with_weak_verb(b))


# ---------------------------------------------------------------------------
# Action verbs
# ---------------------------------------------------------------------------

ACTION_VERBS: frozenset[str] = frozenset([
    "accelerated", "achieved", "administered", "architected", "automated",
    "built", "coached", "collaborated", "created", "cut",
    "delivered", "deployed", "designed", "developed", "directed",
    "drove", "engineered", "established", "executed", "expanded",
    "generated", "grew", "implemented", "improved", "increased",
    "integrated", "launched", "led", "managed", "mentored",
    "migrated", "optimized", "orchestrated", "overhauled", "owned",
    "partnered", "pioneered", "reduced", "refactored", "resolved",
    "scaled", "secured", "shipped", "simplified", "spearheaded",
    "streamlined", "transformed", "unified", "upgraded",
])


def starts_with_action_verb(bullet: str) -> bool:
    first_word = bullet.strip().split()[0].lower() if bullet.strip() else ""
    return first_word in ACTION_VERBS


def count_action_verb_bullets(bullets: list[str]) -> int:
    return sum(1 for b in bullets if starts_with_action_verb(b))


# ---------------------------------------------------------------------------
# Responsibility language
# ---------------------------------------------------------------------------

RESPONSIBILITY_PHRASES: list[str] = [
    "responsible for",
    "duties included",
    "duties include",
    "in charge of",
    "tasked with",
    "job was to",
    "role was to",
]


def starts_with_responsibility_phrase(bullet: str) -> bool:
    lower = bullet.strip().lower()
    return any(lower.startswith(phrase) for phrase in RESPONSIBILITY_PHRASES)


def count_responsibility_bullets(bullets: list[str]) -> int:
    return sum(1 for b in bullets if starts_with_responsibility_phrase(b))


# ---------------------------------------------------------------------------
# Length analysis
# ---------------------------------------------------------------------------

def count_long_bullets(bullets: list[str], max_chars: int = 200) -> int:
    return sum(1 for b in bullets if len(b) > max_chars)


def count_short_bullets(bullets: list[str], min_chars: int = 40) -> int:
    return sum(1 for b in bullets if len(b) < min_chars)
