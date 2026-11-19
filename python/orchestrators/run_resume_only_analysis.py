"""
run_resume_only_analysis.py

Full resume-only analysis pipeline:
  parse → evaluate (3 categories) → score → assemble AnalysisResult
"""

from __future__ import annotations
from ..parsing.parse_resume import parse_resume, build_resume_from_text
from ..rules.evaluators.evaluate_parseability import evaluate_parseability
from ..rules.evaluators.evaluate_structure import evaluate_structure
from ..rules.evaluators.evaluate_content_quality import evaluate_content_quality
from ..scoring.compute_subscores import compute_subscores
from ..scoring.compute_overall_score import compute_overall_score
from ..scoring.weights import get_weights
from ..models.resume import Resume
from ..models.analysis import AnalysisResult, AnalysisMetadata, PriorityFix
from ..models.rules import RuleViolation
from ..utils.text_utils import generate_id, now_iso


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_resume_only_analysis(data: bytes, filename: str) -> AnalysisResult:
    resume = parse_resume(data, filename)
    return _analyze_resume(resume)


def run_resume_only_analysis_from_text(raw_text: str) -> AnalysisResult:
    resume = build_resume_from_text(raw_text, "txt")
    return _analyze_resume(resume)


# ---------------------------------------------------------------------------
# Core pipeline
# ---------------------------------------------------------------------------

def _analyze_resume(resume: Resume) -> AnalysisResult:
    evaluator_results = [
        evaluate_parseability(resume),
        evaluate_structure(resume),
        evaluate_content_quality(resume),
    ]

    subscores = compute_subscores(evaluator_results, "resume_only")
    overall_score = compute_overall_score(subscores)
    all_violations = [v for r in evaluator_results for v in r.violations]

    strengths = _derive_strengths(resume, evaluator_results)
    priority_fixes = _derive_priority_fixes(all_violations, "resume_only")

    return AnalysisResult(
        analysis_id=generate_id(),
        created_at=now_iso(),
        scoring_mode="resume_only",
        overall_score=overall_score,
        subscores=subscores,
        issues=all_violations,
        strengths=strengths,
        priority_fixes=priority_fixes,
        gap_report=None,
        parsed_resume=resume,
        metadata=AnalysisMetadata(
            resume_char_count=len(resume.raw_text),
            parse_confidence=resume.parse_metadata.parse_confidence,
            detected_sections=resume.parse_metadata.detected_sections,
            parse_warnings=resume.parse_metadata.parse_warnings,
        ),
    )


# ---------------------------------------------------------------------------
# Strengths derivation
# ---------------------------------------------------------------------------

def _derive_strengths(resume: Resume, results) -> list[str]:
    strengths: list[str] = []
    penalty_by_category = {r.category: r.total_penalty for r in results}

    contact = resume.contact
    if contact.name and contact.email and contact.phone:
        strengths.append("Contact information is complete with name, email, and phone.")
    if contact.linkedin and contact.github:
        strengths.append("Both LinkedIn and GitHub profiles are present.")

    sections = resume.parse_metadata.detected_sections
    if all(s in sections for s in ["experience", "education", "skills"]):
        strengths.append("All three core sections (Experience, Education, Skills) are present.")
    if resume.summary:
        strengths.append("A professional summary is included.")

    total_bullets = sum(len(e.bullets) for e in resume.experience)
    if total_bullets >= 8:
        strengths.append(f"Experience section contains {total_bullets} detailed bullet points.")

    if len(resume.skills.raw_list) >= 8:
        strengths.append(f"Skills section lists {len(resume.skills.raw_list)} skills.")

    if penalty_by_category.get("parseability", 100) <= 10:
        strengths.append("Resume is highly parseable with clean structure.")
    if penalty_by_category.get("content_quality", 100) <= 15:
        strengths.append("Content quality is strong with clear, impact-focused language.")

    return strengths[:5]


# ---------------------------------------------------------------------------
# Priority fixes derivation
# ---------------------------------------------------------------------------

SEVERITY_RANK: dict[str, int] = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1,
}

RULE_TARGET_SECTION: dict[str, str] = {
    "PARSE_001": "contact", "PARSE_002": "structure", "PARSE_003": "contact",
    "PARSE_004": "contact", "PARSE_005": "contact",   "PARSE_006": "structure",
    "PARSE_007": "summary", "PARSE_008": "contact",   "PARSE_009": "contact",
    "STRUCT_001": "experience", "STRUCT_002": "education", "STRUCT_003": "skills",
    "STRUCT_004": "experience", "STRUCT_005": "experience", "STRUCT_006": "experience",
    "STRUCT_007": "experience", "STRUCT_008": "experience", "STRUCT_009": "education",
    "STRUCT_010": "education",  "STRUCT_011": "experience", "STRUCT_012": "summary",
    "STRUCT_013": "experience",
    "CONTENT_001": "experience", "CONTENT_002": "experience", "CONTENT_003": "experience",
    "CONTENT_004": "experience", "CONTENT_005": "experience", "CONTENT_006": "experience",
    "CONTENT_007": "experience", "CONTENT_008": "experience", "CONTENT_009": "experience",
    "CONTENT_010": "skills",     "CONTENT_011": "skills",     "CONTENT_012": "experience",
}

FIX_SUGGESTIONS: dict[str, str] = {
    "PARSE_001": "Re-export your resume as a text-selectable PDF. Avoid image-based or scanned files.",
    "PARSE_002": "Review section headers — use standard labels like 'Experience', 'Education', 'Skills'.",
    "PARSE_003": "Add a contact block at the top: full name, email address, and phone number.",
    "PARSE_004": "Add a valid email address to your contact section.",
    "PARSE_005": "Add a phone number to your contact section.",
    "PARSE_006": "Add clear section headers (e.g., EXPERIENCE, EDUCATION, SKILLS) to structure your resume.",
    "PARSE_007": "Expand your resume — aim for at least 400–600 words across all sections.",
    "PARSE_008": "Ensure your full name appears on the first line of the resume.",
    "PARSE_009": "Add your LinkedIn and/or GitHub profile URL to the contact section.",
    "STRUCT_001": "Add a dedicated Experience section with at least one role including title, company, dates, and bullets.",
    "STRUCT_002": "Add an Education section with institution name, degree, and graduation year.",
    "STRUCT_003": "Add a Skills section listing 8–15 technical and domain-specific skills.",
    "STRUCT_004": "Add job titles to all experience entries.",
    "STRUCT_005": "Add company names to all experience entries.",
    "STRUCT_006": "Add start and end dates (Month Year) to all experience entries.",
    "STRUCT_007": "Add 3–6 bullet points to each experience entry describing your achievements.",
    "STRUCT_008": "Expand thin experience entries to at least 3 bullet points each.",
    "STRUCT_009": "Add institution names to all education entries.",
    "STRUCT_010": "Add degree names to all education entries.",
    "STRUCT_011": "Trim your resume to two pages — remove older roles or condense bullet points.",
    "STRUCT_012": "Add a 2–4 sentence professional summary at the top of your resume.",
    "STRUCT_013": "Ensure your single experience entry is fully detailed with title, company, dates, and 4–6 bullets.",
    "CONTENT_001": "Add measurable results to at least 25% of bullets (e.g., 'reduced latency by 40%').",
    "CONTENT_002": "Replace weak verbs ('helped', 'assisted') with strong action verbs ('Led', 'Built', 'Reduced').",
    "CONTENT_003": "Start every bullet point with a strong past-tense action verb (e.g., 'Architected', 'Launched').",
    "CONTENT_004": "Shorten long bullets — aim for 100–180 characters each. Split complex bullets into two.",
    "CONTENT_005": "Expand short bullets to include context: what you did, how you did it, and the result.",
    "CONTENT_006": "Add more bullet points — aim for 3–6 per role describing your key achievements.",
    "CONTENT_007": "Remove all first-person pronouns (I, my, me). Use implicit third-person style.",
    "CONTENT_008": "Replace clichés like 'team player' with specific accomplishments.",
    "CONTENT_009": "Reframe responsibility-based bullets as achievement statements using the 'action + result' format.",
    "CONTENT_010": "Expand your skills section to list 8–15 relevant skills.",
    "CONTENT_011": "Add specific technical skills: languages, frameworks, tools, and platforms relevant to your target roles.",
    "CONTENT_012": "Address employment gaps with freelance work, open-source contributions, or a brief explanation.",
}


def _derive_priority_fixes(violations: list[RuleViolation], mode: str) -> list[PriorityFix]:
    weights = get_weights(mode)
    sorted_violations = sorted(
        violations,
        key=lambda v: (SEVERITY_RANK.get(v.severity, 0), v.penalty),
        reverse=True,
    )

    fixes: list[PriorityFix] = []
    for i, v in enumerate(sorted_violations[:5]):
        category_weight = weights.get(v.category, 0)
        weighted_lift = round((v.penalty / 100) * category_weight)
        fixes.append(PriorityFix(
            rank=i + 1,
            rule_id=v.rule_id,
            title=v.title,
            severity=v.severity,
            impact=v.penalty,
            weighted_lift=weighted_lift,
            suggestion=FIX_SUGGESTIONS.get(v.rule_id, v.message),
            target_section=RULE_TARGET_SECTION.get(v.rule_id),
        ))
    return fixes
