/**
 * toUIAnalysis.ts
 *
 * Adapts the backend AnalysisResult into the UIAnalysisResult shape
 * consumed by the results page components.
 *
 * Single source of truth: issues, fixes, and strengths all derive from
 * the same triggered-rule data in AnalysisResult — no parallel heuristics.
 */

import type { AnalysisResult } from "../../types/analysis";
import type { RuleSeverity, RuleViolation } from "../../types/rules";
import type {
  UIAnalysisResult,
  UIGapReport,
  UIIssue,
  UIPriorityFix,
  UIStrength,
  UISubscores,
  IssueSeverity,
  RiskLevel,
  ConfidenceLevel,
} from "../../types/analysisUI";

// ---------------------------------------------------------------------------
// Severity mapping: backend 4-level → UI 3-level
// ---------------------------------------------------------------------------

function toIssueSeverity(s: RuleSeverity): IssueSeverity {
  if (s === "critical") return "critical";
  if (s === "high") return "major";
  return "minor";
}

function toRiskLevel(score: number): RiskLevel {
  if (score >= 70) return "low";
  if (score >= 50) return "medium";
  return "high";
}

// ---------------------------------------------------------------------------
// Actionable fix suggestions keyed by rule ID.
// Used as `how_to_fix` — tells the user what to DO, not what was found.
// ---------------------------------------------------------------------------

const FIX_SUGGESTIONS: Record<string, string> = {
  PARSE_001: "Re-export your resume as a text-selectable PDF. Avoid image-based or scanned files.",
  PARSE_002: "Review section headers — use standard labels like 'Experience', 'Education', 'Skills'.",
  PARSE_003: "Add a contact block at the top: full name, email address, and phone number.",
  PARSE_004: "Add a valid email address to your contact section.",
  PARSE_005: "Add a phone number to your contact section.",
  PARSE_006: "Add clear section headers (e.g., EXPERIENCE, EDUCATION, SKILLS) to structure your resume.",
  PARSE_007: "Expand your resume — aim for at least 400–600 words across all sections.",
  PARSE_008: "Ensure your full name appears on the first line of the resume.",
  PARSE_009: "Add your LinkedIn and/or GitHub profile URL to the contact section.",
  STRUCT_001: "Add a dedicated Experience section with at least one role including title, company, dates, and bullets.",
  STRUCT_002: "Add an Education section with institution name, degree, and graduation year.",
  STRUCT_003: "Add a Skills section listing 8–15 technical and domain-specific skills.",
  STRUCT_004: "Add job titles to all experience entries.",
  STRUCT_005: "Add company names to all experience entries.",
  STRUCT_006: "Add start and end dates (Month Year) to all experience entries.",
  STRUCT_007: "Add 3–6 bullet points to each experience entry describing your achievements.",
  STRUCT_008: "Expand thin experience entries to at least 3 bullet points each.",
  STRUCT_009: "Add institution names to all education entries.",
  STRUCT_010: "Add degree names to all education entries.",
  STRUCT_011: "Trim your resume to two pages — remove older roles or condense bullet points.",
  STRUCT_012: "Add a 2–4 sentence professional summary at the top of your resume.",
  STRUCT_013: "Ensure your single experience entry is fully detailed with title, company, dates, and 4–6 bullets.",
  CONTENT_001: "Add measurable results to at least 25% of bullets (e.g., 'reduced latency by 40%', 'grew revenue by $500K').",
  CONTENT_002: "Replace weak verbs ('helped', 'assisted', 'worked on') with strong action verbs ('Led', 'Built', 'Reduced').",
  CONTENT_003: "Start every bullet point with a strong past-tense action verb (e.g., 'Architected', 'Launched', 'Reduced').",
  CONTENT_004: "Shorten long bullets — aim for 100–180 characters each. Split complex bullets into two.",
  CONTENT_005: "Expand short bullets to include context: what you did, how you did it, and the result.",
  CONTENT_006: "Add more bullet points — aim for 3–6 per role describing your key achievements.",
  CONTENT_007: "Remove all first-person pronouns (I, my, me). Use implicit third-person style.",
  CONTENT_008: "Replace clichés like 'team player' and 'detail-oriented' with specific accomplishments.",
  CONTENT_009: "Reframe responsibility-based bullets as achievement statements using the 'action + result' format.",
  CONTENT_010: "Expand your skills section to list 8–15 relevant skills.",
  CONTENT_011: "Add specific technical skills: languages, frameworks, tools, and platforms relevant to your target roles.",
  CONTENT_012: "Address employment gaps with freelance work, open-source contributions, courses, or a brief explanation.",
};

// ---------------------------------------------------------------------------
// Category display labels
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, string> = {
  parseability: "parseability",
  structure: "structure",
  content_quality: "content_quality",
  jd_match: "jd_match",
};

// ---------------------------------------------------------------------------
// Strengths derived from evaluator results (not independent heuristics)
// ---------------------------------------------------------------------------

/**
 * Derive UI strengths directly from the analysis result.
 * Each strength is gated on the ABSENCE of a related rule violation,
 * ensuring no contradiction (e.g., "content is strong" won't appear
 * when CONTENT_006 fired).
 */
function deriveUIStrengths(result: AnalysisResult): UIStrength[] {
  const firedRules = new Set(result.issues.map((v) => v.ruleId));
  const strengths: UIStrength[] = [];
  let id = 0;

  const add = (title: string, category: string, guard: string[]) => {
    // Only emit this strength if NONE of the guard rules fired
    if (guard.some((r) => firedRules.has(r))) return;
    strengths.push({ id: `strength-${id++}`, title, category, reason: "" });
  };

  const resume = result.parsed_resume;
  if (!resume) return strengths;

  // Contact completeness — only if PARSE_003/004/005/008 didn't fire
  if (resume.contact.name && resume.contact.email && resume.contact.phone) {
    add("Contact information is complete with name, email, and phone.", "parseability",
      ["PARSE_003", "PARSE_004", "PARSE_005", "PARSE_008"]);
  }

  // LinkedIn + GitHub — only if PARSE_009 didn't fire
  if (resume.contact.linkedin && resume.contact.github) {
    add("Both LinkedIn and GitHub profiles are present.", "parseability", ["PARSE_009"]);
  }

  // Section coverage — only if STRUCT_001/002/003 didn't fire
  const sections = resume.parse_metadata.detected_sections;
  if (["experience", "education", "skills"].every((s) => sections.includes(s))) {
    add("All three core sections (Experience, Education, Skills) are present.", "structure",
      ["STRUCT_001", "STRUCT_002", "STRUCT_003"]);
  }

  // Summary — only if STRUCT_012 didn't fire
  if (resume.summary) {
    add("A professional summary is included.", "structure", ["STRUCT_012"]);
  }

  // Bullet depth — only if CONTENT_006/007 didn't fire
  const totalBullets = resume.experience.flatMap((e) => e.bullets).length;
  if (totalBullets >= 8) {
    add(`Experience section contains ${totalBullets} detailed bullet points.`, "content_quality",
      ["CONTENT_006", "STRUCT_007"]);
  }

  // Skills breadth — only if CONTENT_010 didn't fire
  if (resume.skills.raw_list.length >= 8) {
    add(`Skills section lists ${resume.skills.raw_list.length} skills.`, "content_quality",
      ["CONTENT_010", "STRUCT_003"]);
  }

  // Low parseability penalty — only if no parseability rules fired at all
  const parsePenalty = result.subscores.find((s) => s.category === "parseability");
  if (parsePenalty && parsePenalty.raw_score >= 90) {
    add("Resume is highly parseable with clean structure.", "parseability",
      ["PARSE_001", "PARSE_002", "PARSE_006"]);
  }

  // Strong content — only if no content quality rules fired
  const contentPenalty = result.subscores.find((s) => s.category === "content_quality");
  if (contentPenalty && contentPenalty.raw_score >= 85 && totalBullets > 0) {
    add("Content quality is strong with clear, impact-focused language.", "content_quality",
      ["CONTENT_001", "CONTENT_002", "CONTENT_003", "CONTENT_006"]);
  }

  return strengths.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Main adapter
// ---------------------------------------------------------------------------

export function toUIAnalysis(result: AnalysisResult): UIAnalysisResult {
  // Subscores — from the single evaluator+scoring pipeline
  const subscore = (category: string) =>
    result.subscores.find((s) => s.category === category)?.raw_score ?? 0;

  const subscores: UISubscores = {
    parseability: Math.round(subscore("parseability")),
    structure: Math.round(subscore("structure")),
    content_quality: Math.round(subscore("content_quality")),
    jd_match: result.scoring_mode === "resume_and_jd"
      ? Math.round(subscore("jd_match"))
      : null,
  };

  // Issues — directly from triggered violations (single source of truth).
  // `what_we_found` = evaluator's evidence message.
  // `how_to_fix` = actionable suggestion (static map), falling back to evidence
  //                only when no specific suggestion exists.
  const issues: UIIssue[] = result.issues.map((v, i) => ({
    id: `${v.ruleId}-${i}`,
    title: v.title,
    category: v.category,
    severity: toIssueSeverity(v.severity),
    score_impact: v.penalty,
    what_we_found: v.message,
    how_to_fix: FIX_SUGGESTIONS[v.ruleId] ?? v.message,
    target_section: v.target_section,
    target_text: v.target_text,
  }));

  // Priority fixes — from the same violations, sorted by impact.
  // `reason` = evaluator's evidence (what was actually found).
  // `suggested_action` = actionable fix suggestion (what to do about it).
  const priority_fixes: UIPriorityFix[] = result.priority_fixes.map((f) => ({
    title: f.title,
    estimated_score_lift: f.weighted_lift ?? f.impact,
    reason: findViolationMessage(result.issues, f.ruleId) ?? f.suggestion,
    suggested_action: f.suggestion,
    target_section: f.target_section,
  }));

  // Strengths — derived from the same evaluator results, guarded against
  // contradiction with triggered rules.
  const strengths = deriveUIStrengths(result);

  // Parsed resume projection
  const r = result.parsed_resume ?? null;
  const parsed_resume = r ? {
    contact: {
      full_name: r.contact.name ?? undefined,
      email: r.contact.email ?? undefined,
      phone: r.contact.phone ?? undefined,
      location: r.contact.location ?? undefined,
      linkedin: r.contact.linkedin ?? undefined,
      github: r.contact.github ?? undefined,
    },
    summary: r.summary ? { text: r.summary } : undefined,
    skills: { normalized: r.skills.raw_list },
    experience: r.experience.map((e) => ({
      title: e.title ?? undefined,
      company: e.company ?? undefined,
      start_date: e.start_date ?? undefined,
      end_date: e.end_date ?? undefined,
      bullets: e.bullets,
    })),
    education: r.education.map((e) => ({
      degree: e.degree ?? undefined,
      institution: e.institution ?? undefined,
      end_date: e.end_date ?? undefined,
    })),
  } : {};

  const scoreMargin =
    result.metadata.parse_confidence === "high" ? 0
    : result.metadata.parse_confidence === "medium" ? 5
    : 10;

  const gap_report: UIGapReport | null = result.gap_report ?? null;

  return {
    analysis_id: result.analysis_id,
    candidate_name: r?.contact.name ?? undefined,
    overall_score: Math.round(result.overall_score),
    score_margin: scoreMargin,
    risk_level: toRiskLevel(result.overall_score),
    confidence: result.metadata.parse_confidence as ConfidenceLevel,
    subscores,
    issues,
    priority_fixes,
    strengths,
    gap_report,
    parsed_resume,
  };
}

/**
 * Find the evaluator's evidence message for a given rule ID.
 * Used to populate priority fix `reason` with the exact parsed finding
 * instead of a generic fallback.
 */
function findViolationMessage(violations: RuleViolation[], ruleId: string): string | null {
  return violations.find((v) => v.ruleId === ruleId)?.message ?? null;
}
