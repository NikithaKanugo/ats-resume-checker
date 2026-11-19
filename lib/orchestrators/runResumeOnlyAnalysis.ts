/**
 * runResumeOnlyAnalysis.ts
 *
 * Full resume-only analysis pipeline:
 *   parse → evaluate (3 categories) → score → assemble AnalysisResult
 *
 * This orchestrator is intentionally thin. It calls into the correct layers
 * in order and assembles the final shape — no scoring or parsing logic lives here.
 */

import type { ParseResumeInput } from "../parsing/parseResume";
import type { ResumeSchemaType } from "../schemas/resumeSchema";
import type { EvaluatorResult, RuleViolation } from "../../types/rules";
import type { AnalysisResult, PriorityFix } from "../../types/analysis";

import { parseResume, buildResumeFromText } from "../parsing/parseResume";
import { evaluateParseability } from "../rules/evaluators/evaluateParseability";
import { evaluateStructure } from "../rules/evaluators/evaluateStructure";
import { evaluateContentQuality } from "../rules/evaluators/evaluateContentQuality";
import { computeSubscores } from "../scoring/computeSubscores";
import { computeOverallScore } from "../scoring/computeOverallScore";
import { getWeights } from "../scoring/weights";
import { generateId, nowIso } from "../utils/textUtils";
import { log } from "../utils/logger";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run the full resume-only analysis pipeline from a file buffer.
 */
export async function runResumeOnlyAnalysis(
  input: ParseResumeInput
): Promise<AnalysisResult> {
  const resume = await parseResume(input);
  return analyzeResume(resume);
}

/**
 * Run the pipeline from pre-parsed text (useful for testing or direct paste input).
 */
export function runResumeOnlyAnalysisFromText(rawText: string): AnalysisResult {
  const resume = buildResumeFromText(rawText, "txt");
  return analyzeResume(resume);
}

// ---------------------------------------------------------------------------
// Core pipeline
// ---------------------------------------------------------------------------

function analyzeResume(resume: ResumeSchemaType): AnalysisResult {
  log.info("analysis_start", {
    char_count: resume.raw_text.length,
    sections: resume.parse_metadata.detected_sections,
    confidence: resume.parse_metadata.parse_confidence,
    experience_count: resume.experience.length,
  });

  // Step 1: Run all three evaluators
  const evaluatorResults: EvaluatorResult[] = [
    evaluateParseability(resume),
    evaluateStructure(resume),
    evaluateContentQuality(resume),
  ];

  // Step 2: Compute per-category weighted scores
  const subscores = computeSubscores(evaluatorResults, "resume_only");

  // Step 3: Compute overall score
  const overallScore = computeOverallScore(subscores);

  // Step 4: Collect all violations across categories
  const allViolations = evaluatorResults.flatMap((r) => r.violations);

  // Step 5: Derive strengths and priority fixes
  const strengths = deriveStrengths(resume, evaluatorResults);
  const priorityFixes = derivePriorityFixes(allViolations, "resume_only");

  const analysisId = generateId();

  log.info("analysis_complete", {
    analysis_id: analysisId,
    overall_score: overallScore,
    issue_count: allViolations.length,
    fix_count: priorityFixes.length,
    strength_count: strengths.length,
  });

  return {
    analysis_id: analysisId,
    created_at: nowIso(),
    scoring_mode: "resume_only",
    overall_score: overallScore,
    subscores,
    issues: allViolations,
    strengths,
    priority_fixes: priorityFixes,
    gap_report: null, // populated only in resume_and_jd mode
    parsed_resume: resume,
    metadata: {
      resume_char_count: resume.raw_text.length,
      parse_confidence: resume.parse_metadata.parse_confidence,
      detected_sections: resume.parse_metadata.detected_sections,
      parse_warnings: resume.parse_metadata.parse_warnings,
    },
  };
}

// ---------------------------------------------------------------------------
// Strengths derivation
// ---------------------------------------------------------------------------

/**
 * Identify genuine positives in the resume based on evaluator results and
 * resume content. Returns at most 5 strength statements.
 */
function deriveStrengths(
  resume: ResumeSchemaType,
  results: EvaluatorResult[]
): string[] {
  const strengths: string[] = [];

  const penaltyByCategory = Object.fromEntries(
    results.map((r) => [r.category, r.totalPenalty])
  );

  // Contact completeness
  const { contact } = resume;
  if (contact.name && contact.email && contact.phone) {
    strengths.push("Contact information is complete with name, email, and phone.");
  }
  if (contact.linkedin && contact.github) {
    strengths.push("Both LinkedIn and GitHub profiles are present.");
  }

  // Section coverage
  const sections = resume.parse_metadata.detected_sections;
  if (["experience", "education", "skills"].every((s) => sections.includes(s))) {
    strengths.push("All three core sections (Experience, Education, Skills) are present.");
  }
  if (resume.summary) {
    strengths.push("A professional summary is included.");
  }

  // Experience quality
  const totalBullets = resume.experience.flatMap((e) => e.bullets).length;
  if (totalBullets >= 8) {
    strengths.push(`Experience section contains ${totalBullets} detailed bullet points.`);
  }

  // Skills breadth
  if (resume.skills.raw_list.length >= 8) {
    strengths.push(`Skills section lists ${resume.skills.raw_list.length} skills.`);
  }

  // Low-penalty categories
  if ((penaltyByCategory["parseability"] ?? 100) <= 10) {
    strengths.push("Resume is highly parseable with clean structure.");
  }
  if ((penaltyByCategory["content_quality"] ?? 100) <= 15) {
    strengths.push("Content quality is strong with clear, impact-focused language.");
  }

  return strengths.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Priority fixes derivation
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/** Maps rule IDs to the resume section the user should edit to fix the issue. */
const RULE_TARGET_SECTION: Record<string, string> = {
  PARSE_001: "contact", PARSE_002: "structure", PARSE_003: "contact",
  PARSE_004: "contact", PARSE_005: "contact",   PARSE_006: "structure",
  PARSE_007: "summary", PARSE_008: "contact",   PARSE_009: "contact",
  STRUCT_001: "experience", STRUCT_002: "education",  STRUCT_003: "skills",
  STRUCT_004: "experience", STRUCT_005: "experience", STRUCT_006: "experience",
  STRUCT_007: "experience", STRUCT_008: "experience", STRUCT_009: "education",
  STRUCT_010: "education",  STRUCT_011: "experience", STRUCT_012: "summary",
  STRUCT_013: "experience",
  CONTENT_001: "experience", CONTENT_002: "experience", CONTENT_003: "experience",
  CONTENT_004: "experience", CONTENT_005: "experience", CONTENT_006: "experience",
  CONTENT_007: "experience", CONTENT_008: "experience", CONTENT_009: "experience",
  CONTENT_010: "skills",     CONTENT_011: "skills",     CONTENT_012: "experience",
  JD_001: "skills", JD_002: "skills",     JD_003: "skills",
  JD_004: "skills", JD_005: "experience", JD_006: "experience",
  JD_007: "education", JD_008: "experience", JD_009: "skills",
};

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

/**
 * Sort violations by severity + penalty, pick the top 5.
 * Attaches actionable suggestions, target section, and a weighted score lift
 * so callers know exactly how many overall points each fix is worth.
 */
function derivePriorityFixes(
  violations: RuleViolation[],
  mode: import("../../types/analysis").ScoringMode
): PriorityFix[] {
  const weights = getWeights(mode);

  const sorted = [...violations].sort((a, b) => {
    const severityDiff =
      (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
    if (severityDiff !== 0) return severityDiff;
    return b.penalty - a.penalty;
  });

  return sorted.slice(0, 5).map((v, index) => {
    const categoryWeight = weights[v.category] ?? 0;
    // weighted_lift: how many overall score points are recovered when this
    // issue is fixed. Formula: (penalty / 100) * categoryWeight.
    const weighted_lift = Math.round((v.penalty / 100) * categoryWeight);

    return {
      rank: index + 1,
      ruleId: v.ruleId,
      title: v.title,
      severity: v.severity,
      impact: v.penalty,
      weighted_lift,
      suggestion: FIX_SUGGESTIONS[v.ruleId] ?? v.message,
      target_section: RULE_TARGET_SECTION[v.ruleId],
    };
  });
}
