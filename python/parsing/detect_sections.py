"""
detect_sections.py

Segments a raw resume text string into named sections.
Pure function: takes text, returns a section map + detected section names.
"""

from __future__ import annotations
import re
from dataclasses import dataclass, field
from typing import Optional

SectionKey = str  # "contact" | "summary" | "experience" | "education" | "skills" | ...

# ---------------------------------------------------------------------------
# Section header patterns
# ---------------------------------------------------------------------------

SECTION_PATTERNS: list[tuple[str, list[re.Pattern]]] = [
    ("summary", [
        re.compile(r"^(professional\s+)?summary$", re.I),
        re.compile(r"^objective$", re.I),
        re.compile(r"^profile$", re.I),
        re.compile(r"^about\s+me$", re.I),
        re.compile(r"^career\s+objective$", re.I),
    ]),
    ("experience", [
        re.compile(r"^(work\s+)?experience$", re.I),
        re.compile(r"^(professional\s+)?experience$", re.I),
        re.compile(r"^employment(\s+history)?$", re.I),
        re.compile(r"^work\s+history$", re.I),
        re.compile(r"^career\s+history$", re.I),
    ]),
    ("education", [
        re.compile(r"^education(al\s+background)?$", re.I),
        re.compile(r"^academic\s+(background|history)$", re.I),
        re.compile(r"^degrees?$", re.I),
    ]),
    ("skills", [
        re.compile(r"^(technical\s+)?skills$", re.I),
        re.compile(r"^core\s+competencies$", re.I),
        re.compile(r"^competencies$", re.I),
        re.compile(r"^technologies?$", re.I),
        re.compile(r"^tools\s+&\s+technologies$", re.I),
        re.compile(r"^expertise$", re.I),
    ]),
    ("certifications", [
        re.compile(r"^certifications?$", re.I),
        re.compile(r"^licenses?\s+&\s+certifications?$", re.I),
        re.compile(r"^credentials?$", re.I),
        re.compile(r"^professional\s+development$", re.I),
    ]),
    ("projects", [
        re.compile(r"^(personal\s+|side\s+)?projects?$", re.I),
        re.compile(r"^notable\s+projects?$", re.I),
        re.compile(r"^open[\s-]source$", re.I),
    ]),
]


@dataclass
class DetectSectionsResult:
    sections: dict[str, str] = field(default_factory=dict)
    detected_section_names: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass
class HeaderMatch:
    line_index: int
    key: str
    raw_header: str


def detect_sections(raw_text: str) -> DetectSectionsResult:
    warnings: list[str] = []
    lines = raw_text.split("\n")

    header_matches = _find_header_positions(lines)

    if not header_matches:
        warnings.append(
            "No section headers detected. Resume may be unstructured or use non-standard formatting."
        )
        return DetectSectionsResult(
            sections={"contact": raw_text},
            detected_section_names=[],
            warnings=warnings,
        )

    sections: dict[str, str] = {}
    detected: list[str] = []

    # Everything before the first header is the contact block
    first_header_line = header_matches[0].line_index
    if first_header_line > 0:
        sections["contact"] = "\n".join(lines[:first_header_line]).strip()

    for i, current in enumerate(header_matches):
        next_line_index = (
            header_matches[i + 1].line_index
            if i + 1 < len(header_matches)
            else len(lines)
        )
        section_content = "\n".join(
            lines[current.line_index + 1 : next_line_index]
        ).strip()

        if current.key not in sections:
            sections[current.key] = section_content
            detected.append(current.key)
        else:
            sections[current.key] += "\n\n" + section_content
            warnings.append(
                f'Duplicate section header detected: "{current.raw_header}". Content merged.'
            )

    if "experience" not in sections:
        warnings.append("No experience section detected.")
    if "education" not in sections:
        warnings.append("No education section detected.")

    return DetectSectionsResult(
        sections=sections,
        detected_section_names=detected,
        warnings=warnings,
    )


# ---------------------------------------------------------------------------
# Header detection helpers
# ---------------------------------------------------------------------------

def _find_header_positions(lines: list[str]) -> list[HeaderMatch]:
    matches: list[HeaderMatch] = []
    for i, line in enumerate(lines):
        trimmed = line.strip()
        if not trimmed:
            continue
        if len(trimmed) > 60 or re.search(r"[.,;]$", trimmed):
            continue
        key = _resolve_header_key(trimmed)
        if key:
            matches.append(HeaderMatch(line_index=i, key=key, raw_header=trimmed))
    return matches


def _resolve_header_key(line: str) -> Optional[str]:
    # Strip common decorators: "── EXPERIENCE ──", "=== Skills ==="
    cleaned = re.sub(r"^[\-=*#>\s]+|[\-=*#<\s]+$", "", line).strip()
    for key, patterns in SECTION_PATTERNS:
        if any(p.search(cleaned) for p in patterns):
            return key
    return None
