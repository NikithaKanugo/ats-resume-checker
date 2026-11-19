"""
parse_resume.py

Top-level parsing orchestrator. Drives the pipeline:
  extract_text → detect_sections → parse each section → build Resume

Sub-parsers (contact, experience, education, skills) are pure functions.
"""

from __future__ import annotations
import re
from dataclasses import dataclass, field
from typing import Optional

from ..models.resume import (
    Resume, ContactInfo, ExperienceEntry, EducationEntry,
    SkillsSection, ParseMetadata, SectionConfidence, FallbacksUsed,
)
from .extract_text import detect_format, extract_text, FileFormat
from .detect_sections import detect_sections

# ---------------------------------------------------------------------------
# Parse trace
# ---------------------------------------------------------------------------

@dataclass
class SplitDecision:
    line: str
    action: str  # "split" | "absorb"
    reason: str


@dataclass
class ParseTrace:
    experience_header_fallback: bool = False
    paragraph_to_bullet_fallback: bool = False
    education_grouping_fallback: bool = False
    linkedin_bare_word_fallback: bool = False
    experience_split_log: list[SplitDecision] = field(default_factory=list)


_trace = ParseTrace()


def _fresh_trace() -> ParseTrace:
    return ParseTrace()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def parse_resume(data: bytes, filename: str) -> Resume:
    fmt = detect_format(filename)
    raw_text = extract_text(data, fmt)
    return build_resume_from_text(raw_text, fmt)


def build_resume_from_text(raw_text: str, fmt: FileFormat = "txt") -> Resume:
    global _trace
    _trace = _fresh_trace()

    result = detect_sections(raw_text)
    sections = result.sections
    detected = result.detected_section_names
    warnings = result.warnings

    contact = _safe_parse(
        "contact",
        lambda: _parse_contact(sections.get("contact", ""), raw_text),
        ContactInfo(),
        warnings,
    )
    experience = _safe_parse(
        "experience",
        lambda: _parse_experience(sections.get("experience", "")),
        [],
        warnings,
    )
    education = _safe_parse(
        "education",
        lambda: _parse_education(sections.get("education", "")),
        [],
        warnings,
    )
    skills = _safe_parse(
        "skills",
        lambda: _parse_skills(sections.get("skills", "")),
        SkillsSection(),
        warnings,
    )

    parsed = dict(contact=contact, experience=experience, education=education, skills=skills)

    section_confidence = _derive_section_confidence(detected, parsed)
    parse_confidence = _derive_parse_confidence(detected, warnings, parsed)

    return Resume(
        contact=contact,
        summary=(sections.get("summary") or "").strip() or None,
        experience=experience,
        education=education,
        skills=skills,
        certifications=_parse_simple_list(sections.get("certifications", "")),
        projects=_parse_simple_list(sections.get("projects", "")),
        raw_text=raw_text,
        parse_metadata=ParseMetadata(
            source_format=fmt,
            parse_confidence=parse_confidence,
            char_count=len(raw_text),
            page_count=None,
            detected_sections=detected,
            parse_warnings=warnings,
            section_confidence=section_confidence,
            fallbacks_used=FallbacksUsed(
                experience_header_fallback=_trace.experience_header_fallback,
                paragraph_to_bullet_fallback=_trace.paragraph_to_bullet_fallback,
                education_grouping_fallback=_trace.education_grouping_fallback,
                linkedin_bare_word_fallback=_trace.linkedin_bare_word_fallback,
                experience_split_log=[
                    {"line": d.line, "action": d.action, "reason": d.reason}
                    for d in _trace.experience_split_log
                ],
            ),
        ),
    )


def _safe_parse(section: str, fn, fallback, warnings: list[str]):
    try:
        return fn()
    except Exception as e:
        warnings.append(f"Parser fallback: {section} section could not be parsed — {e}")
        return fallback


# ---------------------------------------------------------------------------
# Contact parser
# ---------------------------------------------------------------------------

def _parse_contact(block: str, full_text: str = "") -> ContactInfo:
    lines = [l.strip() for l in block.split("\n") if l.strip()]

    def find_url(pattern: re.Pattern) -> Optional[str]:
        m = pattern.search(block)
        if m:
            return m.group(0).strip()
        m = pattern.search(full_text)
        return m.group(0).strip() if m else None

    def find_linkedin() -> Optional[str]:
        url = find_url(LINKEDIN_RE)
        if url:
            return url
        combined = block + "\n" + full_text[:500]
        if re.search(r"(?:^|\s)linkedin(?:\s|$)", combined, re.I):
            _trace.linkedin_bare_word_fallback = True
            return "linkedin.com"
        return None

    return ContactInfo(
        name=_extract_name(lines),
        email=_extract_pattern(block, EMAIL_RE),
        phone=_extract_pattern(block, PHONE_RE),
        linkedin=find_linkedin(),
        github=find_url(GITHUB_RE),
        location=_extract_location(lines),
    )


def _extract_name(lines: list[str]) -> Optional[str]:
    for l in lines:
        if not EMAIL_RE.search(l) and not URL_RE.search(l) and not PHONE_RE.search(l):
            return l
    return None


def _extract_location(lines: list[str]) -> Optional[str]:
    for l in lines:
        if LOCATION_RE.search(l):
            return l
    return None


def _extract_pattern(text: str, pattern: re.Pattern) -> Optional[str]:
    m = pattern.search(text)
    return m.group(0).strip() if m else None


# ---------------------------------------------------------------------------
# Experience parser
# ---------------------------------------------------------------------------

def _parse_experience(block: str) -> list[ExperienceEntry]:
    if not block.strip():
        return []

    raw_entries = _split_on_entry_boundaries(block)
    result: list[ExperienceEntry] = []

    for raw in raw_entries:
        entry = _parse_experience_entry(raw)
        first_line = raw.split("\n")[0].strip() if raw.split("\n") else ""
        is_prose_like = (
            len(first_line) > 60
            or bool(re.search(r"[.!?]$", first_line))
            or bool(re.match(r"^(the|a |an |this |that |our |we |i |my )", first_line, re.I))
        )
        is_content_block = (
            not entry.start_date
            and not entry.end_date
            and not entry.company
            and (entry.title is None or len(entry.title) > 80 or is_prose_like)
        )

        if is_content_block and result:
            bullet_lines = [
                _strip_bullet(l.strip())
                for l in raw.split("\n")
                if BULLET_RE.match(l.strip())
            ]
            if bullet_lines:
                result[-1].bullets.extend(bullet_lines)
        elif _is_non_empty_entry(entry):
            result.append(entry)

    return result


def _parse_experience_entry(raw: str) -> ExperienceEntry:
    lines = [l.strip() for l in raw.split("\n") if l.strip()]
    marked_bullets = [_strip_bullet(l) for l in lines if BULLET_RE.match(l)]
    non_bullets = [l for l in lines if not BULLET_RE.match(l)]

    header = _parse_title_line(non_bullets[0] if non_bullets else None)
    title, company, location = header["title"], header["company"], header["location"]

    if not company and len(non_bullets) >= 2:
        line2 = non_bullets[1].strip()
        is_date_line = bool(DATE_RANGE_RE.search(line2))
        is_location_only = _is_location_token(line2)
        if not is_date_line and not is_location_only and 0 < len(line2) < 80:
            company = DATE_RANGE_RE.sub("", line2).strip() or None
            if company:
                _trace.experience_header_fallback = True

    header_text = " ".join(non_bullets)
    start_date, end_date, is_current = _parse_date_range(header_text)

    bullets = marked_bullets
    if not bullets:
        header_line_count = _count_header_lines(non_bullets, title, company)
        body_lines = non_bullets[header_line_count:]
        if body_lines:
            body_text = " ".join(body_lines)
            bullets = _split_paragraph_into_bullets(body_text)
            if bullets:
                _trace.paragraph_to_bullet_fallback = True

    loc = location or _extract_pattern(header_text, LOCATION_RE)

    return ExperienceEntry(
        company=company,
        title=title,
        start_date=start_date,
        end_date=end_date,
        is_current=is_current,
        location=loc,
        bullets=bullets,
        raw_text=raw.strip(),
    )


def _count_header_lines(non_bullets: list[str], title: Optional[str], company: Optional[str]) -> int:
    count = 0
    for line in non_bullets:
        is_date = bool(DATE_RANGE_RE.search(line))
        is_loc = _is_location_token(line)
        is_short_meta = len(line) < 40 and not re.search(r"[.!?]$", line)
        is_title = title is not None and title in line
        is_company = company is not None and company in line
        if is_date or is_loc or is_short_meta or is_title or is_company:
            count += 1
        else:
            break
    return count


# ---------------------------------------------------------------------------
# Paragraph-to-bullet extraction
# ---------------------------------------------------------------------------

def _split_paragraph_into_bullets(text: str) -> list[str]:
    if not text.strip():
        return []

    PLACEHOLDER = "\x00"
    protected = re.sub(
        r"\b(e\.g|i\.e|vs|etc|Dr|Mr|Mrs|Ms|Jr|Sr|Inc|Corp|Ltd|Co|U\.S|U\.K)\.",
        lambda m: m.group(1) + PLACEHOLDER,
        text,
        flags=re.I,
    )

    fragments = re.split(r"\.\s+|;\s+", protected)
    result = []
    for f in fragments:
        cleaned = f.replace(PLACEHOLDER, ".").rstrip(".").strip()
        if (
            len(cleaned) >= 20
            and not DATE_RANGE_RE.search(cleaned)
            and not _is_location_token(cleaned)
        ):
            result.append(cleaned)
    return result


# ---------------------------------------------------------------------------
# Title / Company / Location extraction
# ---------------------------------------------------------------------------

def _parse_title_line(line: Optional[str]) -> dict:
    if not line:
        return {"title": None, "company": None, "location": None}

    clean = DATE_RANGE_RE.sub("", line).strip()
    if not clean:
        return {"title": None, "company": None, "location": None}

    location: Optional[str] = None

    # Extract trailing location "City, ST"
    loc_match = re.search(r"(.+?)\s*[,|]\s*([A-Z][a-zA-Z\s]+,\s+[A-Z]{2})\s*$", clean)
    if loc_match:
        location = loc_match.group(2).strip()
        clean = loc_match.group(1).strip()
    else:
        remote_match = re.search(r"(.+?)\s*[,|]\s*(Remote)\s*$", clean, re.I)
        if remote_match:
            location = remote_match.group(2).strip()
            clean = remote_match.group(1).strip()

    # Strong separators: — – | @
    strong_parts = re.split(r"\s*[—–|@]\s*", clean)
    if len(strong_parts) >= 2 and strong_parts[0] and strong_parts[1]:
        return {"title": strong_parts[0].strip(), "company": " ".join(strong_parts[1:]).strip(), "location": location}

    # Spaced hyphen
    hyphen_parts = re.split(r"\s+-\s+", clean)
    if len(hyphen_parts) >= 2 and hyphen_parts[0] and hyphen_parts[1]:
        return {"title": hyphen_parts[0].strip(), "company": " - ".join(hyphen_parts[1:]).strip(), "location": location}

    # " at "
    at_parts = re.split(r"\s+at\s+", clean, flags=re.I)
    if len(at_parts) >= 2 and at_parts[0] and at_parts[1]:
        return {"title": at_parts[0].strip(), "company": " at ".join(at_parts[1:]).strip(), "location": location}

    # Comma
    comma_idx = clean.find(",")
    if 0 < comma_idx < len(clean) - 1:
        before = clean[:comma_idx].strip()
        after = clean[comma_idx + 1:].strip()
        if re.match(r"^[A-Z]{2}$", after):
            return {"title": before, "company": None, "location": location or after}
        if LOCATION_RE.search(after):
            return {"title": before, "company": None, "location": location or after}
        return {"title": before, "company": after, "location": location}

    return {"title": clean or None, "company": None, "location": location}


def _is_location_token(s: str) -> bool:
    trimmed = s.strip()
    if re.match(r"^remote$", trimmed, re.I):
        return True
    return bool(LOCATION_RE.search(trimmed)) and len(trimmed) < 35


def _parse_date_range(text: str) -> tuple[Optional[str], Optional[str], bool]:
    m = DATE_RANGE_RE.search(text)
    if not m:
        return None, None, False
    end_raw = (m.group(2) or "").strip()
    is_current = bool(re.search(r"present|current|now", end_raw, re.I))
    return (m.group(1) or "").strip() or None, (None if is_current else end_raw or None), is_current


TITLE_LINE_RE = re.compile(r"^[A-Z][A-Za-z].*(?:[A-Za-z]{3,})")


def _is_role_header(trimmed: str, next_non_empty: Optional[str]) -> bool:
    if BULLET_RE.match(trimmed):
        return False
    date_only = DATE_RANGE_RE.search(trimmed) and not DATE_RANGE_RE.sub("", trimmed).strip()
    if date_only:
        return False
    if _is_location_token(trimmed):
        return False
    if re.search(r"[.!?]$", trimmed):
        return False
    if len(trimmed) > 80:
        return False

    has_strong_sep = (
        bool(re.search(r"\s*[—–|@]\s*", trimmed))
        or bool(re.search(r"\s+at\s+", trimmed, re.I))
        or (bool(re.search(r",\s*\S", trimmed)) and not LOCATION_RE.search(trimmed))
    )
    if has_strong_sep:
        return True

    if not TITLE_LINE_RE.match(trimmed):
        return False

    if next_non_empty:
        if DATE_RANGE_RE.search(next_non_empty):
            return True
        is_company_like = (
            len(next_non_empty) < 40
            and not BULLET_RE.match(next_non_empty)
            and not _is_location_token(next_non_empty)
            and not re.search(r"[.!?]", next_non_empty)
        )
        if is_company_like:
            return True

    return False


def _split_on_entry_boundaries(block: str) -> list[str]:
    by_blank = [s for s in re.split(r"\n{2,}", block) if s.strip()]
    if len(by_blank) > 1:
        return by_blank

    lines = block.split("\n")
    entries: list[str] = []
    current: list[str] = []
    seen_content = False

    for i, line in enumerate(lines):
        trimmed = line.strip()
        if not trimmed:
            current.append(line)
            continue

        is_bullet = bool(BULLET_RE.match(trimmed))
        date_only_match = DATE_RANGE_RE.search(trimmed)
        is_date_only = bool(date_only_match) and not DATE_RANGE_RE.sub("", trimmed).strip()

        next_non_empty = next(
            (lines[j].strip() for j in range(i + 1, len(lines)) if lines[j].strip()),
            None,
        )

        is_new_role = _is_role_header(trimmed, next_non_empty)

        if seen_content and is_new_role and current:
            _trace.experience_split_log.append(
                SplitDecision(
                    line=trimmed[:80],
                    action="split",
                    reason="new role header detected after content",
                )
            )
            entries.append("\n".join(current))
            current = [line]
            seen_content = False
        else:
            if (
                is_bullet
                or is_date_only
                or _is_location_token(trimmed)
                or (current and not is_new_role and len(trimmed) > 20)
            ):
                seen_content = True
            current.append(line)

    if current:
        entries.append("\n".join(current))
    return [e for e in entries if e.strip()]


def _is_non_empty_entry(entry: ExperienceEntry) -> bool:
    return bool(entry.title or entry.company or entry.bullets)


# ---------------------------------------------------------------------------
# Education parser
# ---------------------------------------------------------------------------

def _parse_education(block: str) -> list[EducationEntry]:
    if not block.strip():
        return []

    raw_entries = _split_on_entry_boundaries(block)
    lines = [l.strip() for l in block.split("\n") if l.strip()]
    if len(raw_entries) == 1 and len(lines) >= 4:
        _trace.education_grouping_fallback = True

    return [
        e for e in (_parse_education_entry(r) for r in raw_entries)
        if e.institution or e.degree
    ]


def _parse_education_entry(raw: str) -> EducationEntry:
    lines = [l.strip() for l in raw.split("\n") if l.strip()]
    start_date, end_date, _ = _parse_date_range(" ".join(lines))
    gpa_match = re.search(r"GPA[:\s]+([0-9.]+)", raw, re.I)

    return EducationEntry(
        institution=lines[0] if lines else None,
        degree=lines[1] if len(lines) > 1 else None,
        field_of_study=_extract_field_of_study(lines[1] if len(lines) > 1 else ""),
        start_date=start_date,
        end_date=end_date,
        gpa=gpa_match.group(1) if gpa_match else None,
        raw_text=raw.strip(),
    )


def _extract_field_of_study(degree_line: str) -> Optional[str]:
    m = re.match(
        r"(?:B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?B\.?A\.?|Ph\.?D\.?)\s+(?:in\s+)?(.+)",
        degree_line,
        re.I,
    )
    return m.group(1).strip() if m else None


# ---------------------------------------------------------------------------
# Skills parser
# ---------------------------------------------------------------------------

def _parse_skills(block: str) -> SkillsSection:
    if not block.strip():
        return SkillsSection()

    categories: dict[str, list[str]] = {}
    raw_list: list[str] = []

    for line in block.split("\n"):
        line = line.strip()
        if not line:
            continue
        cat_match = re.match(r"^([^:]{2,40}):\s+(.+)$", line)
        if cat_match:
            cat = cat_match.group(1).strip()
            items = [s.strip() for s in re.split(r"[,|]", cat_match.group(2)) if s.strip()]
            categories[cat] = items
            raw_list.extend(items)
        else:
            items = [s.strip() for s in re.split(r"[,|•·]", line) if s.strip()]
            raw_list.extend(items)

    return SkillsSection(raw_list=list(dict.fromkeys(raw_list)), categories=categories)


# ---------------------------------------------------------------------------
# Certifications + Projects parsers
# ---------------------------------------------------------------------------

def _parse_simple_list(block: str) -> list[str]:
    return [_strip_bullet(l.strip()) for l in block.split("\n") if l.strip()]


# ---------------------------------------------------------------------------
# Parse confidence
# ---------------------------------------------------------------------------

def _derive_parse_confidence(
    sections: list[str],
    warnings: list[str],
    parsed: dict,
) -> str:
    score = 0

    if "experience" in sections and len(parsed.get("experience", [])) > 0:
        score += 30
    if "education" in sections and len(parsed.get("education", [])) > 0:
        score += 20
    if "skills" in sections and len(parsed.get("skills", SkillsSection()).raw_list) > 0:
        score += 10

    contact = parsed.get("contact", ContactInfo())
    if contact.name:
        score += 5
    if contact.email:
        score += 5
    if contact.phone:
        score += 5

    exp_list = parsed.get("experience", [])
    if any(e.start_date or e.end_date or e.is_current for e in exp_list):
        score += 10

    if not warnings:
        score += 10

    all_bullets = [b for e in exp_list for b in e.bullets]
    if len(all_bullets) >= 4:
        score += 5

    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def _derive_section_confidence(detected: list[str], parsed: dict) -> SectionConfidence:
    contact = parsed.get("contact", ContactInfo())
    contact_fields = sum(1 for f in [contact.name, contact.email, contact.phone] if f)
    contact_conf = "high" if contact_fields >= 2 else ("medium" if contact_fields >= 1 else "low")

    exp_list = parsed.get("experience", [])
    exp_detected = "experience" in detected
    exp_entries = len(exp_list)
    exp_has_dates = any(e.start_date or e.end_date or e.is_current for e in exp_list)
    exp_has_bullets = any(e.bullets for e in exp_list)
    if exp_detected and exp_entries > 0 and exp_has_dates and exp_has_bullets:
        exp_conf = "high"
    elif exp_detected and exp_entries > 0:
        exp_conf = "medium"
    else:
        exp_conf = "low"

    edu_list = parsed.get("education", [])
    edu_detected = "education" in detected
    edu_entries = len(edu_list)
    edu_has_inst = any(e.institution for e in edu_list)
    if edu_detected and edu_entries > 0 and edu_has_inst:
        edu_conf = "high"
    elif edu_detected and edu_entries > 0:
        edu_conf = "medium"
    else:
        edu_conf = "low"

    skills = parsed.get("skills", SkillsSection())
    skills_detected = "skills" in detected
    skill_count = len(skills.raw_list)
    if skills_detected and skill_count >= 5:
        skills_conf = "high"
    elif skills_detected and skill_count > 0:
        skills_conf = "medium"
    else:
        skills_conf = "low"

    return SectionConfidence(
        contact=contact_conf,
        experience=exp_conf,
        education=edu_conf,
        skills=skills_conf,
    )


# ---------------------------------------------------------------------------
# Regex constants
# ---------------------------------------------------------------------------

EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
PHONE_RE = re.compile(r"(\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}")
LINKEDIN_RE = re.compile(r"(?:https?://)?(?:www\.)?linkedin\.com/in/[a-zA-Z0-9_%-]+/?", re.I)
GITHUB_RE = re.compile(r"github\.com/[a-zA-Z0-9\-_%]+", re.I)
URL_RE = re.compile(r"https?://|www\.|linkedin\.com|github\.com", re.I)
LOCATION_RE = re.compile(r"[A-Z][a-zA-Z\s]+,\s+[A-Z]{2}")
BULLET_RE = re.compile(r"^[•·\-*>]\s+")

MONTH_ABBR = r"(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?"
DATE_TOKEN = "|".join([
    rf"{MONTH_ABBR}\s+\d{{4}}",   # Jan 2024
    r"\d{1,2}/\d{4}",              # 12/2024
    r"\d{1,2}/\d{2}(?!\d)",        # 12/24
    r"\d{4}",                       # 2024
    MONTH_ABBR,                     # Jan
])
DATE_RANGE_RE = re.compile(
    rf"({DATE_TOKEN})\s*[-–—]+\s*({DATE_TOKEN}|[Pp]resent|[Cc]urrent|[Nn]ow)"
)


def _strip_bullet(line: str) -> str:
    return BULLET_RE.sub("", line).strip()
