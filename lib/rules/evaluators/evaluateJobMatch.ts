/**
 * evaluateJobMatch.ts
 *
 * Evaluates alignment between the resume and a job description.
 * Only called when scoring_mode === "resume_and_jd".
 */

import type { ResumeSchemaType } from "../../schemas/resumeSchema";
import type { JobDescriptionSchemaType } from "../../schemas/jobDescriptionSchema";
import type { EvaluatorResult, RuleDefinition, RuleViolation } from "../../../types/rules";
import { JD_MATCH_RULES_MAP } from "../definitions/jdMatchRules";
import {
  buildSearchContext,
  calculateKeywordCoverage,
  calculateExperienceKeywordDensity,
  calculateSkillsKeywordCoverage,
  findMissingRequiredSkills,
  findMissingPreferredSkills,
  estimateTotalExperienceYears,
  hasTitleMatch,
  meetsEducationRequirement,
} from "../helpers/keywordHelpers";
import { buildViolation, buildEvaluatorResult } from "./_buildResult";

export function evaluateJobMatch(
  resume: ResumeSchemaType,
  jd: JobDescriptionSchemaType
): EvaluatorResult {
  const violations: RuleViolation[] = [];
  const triggeredCapRules: RuleDefinition[] = [];

  function check(ruleId: string, condition: boolean, message: string): void {
    if (!condition) return;
    violations.push(buildViolation(JD_MATCH_RULES_MAP[ruleId], message));
  }

  // Build search context once — shared by all keyword/skill queries below
  const ctx = buildSearchContext(resume);

  // ── Keyword coverage ──────────────────────────────────────────────────────

  const coverage = calculateKeywordCoverage(resume, jd, ctx);
  const coveragePct = Math.round(coverage * 100);

  // JD_001: Critical — below 40%
  check(
    "JD_001",
    coverage < 0.4,
    `Only ${coveragePct}% of job description keywords appear in your resume. ATS systems require at least 40–60% keyword overlap to rank competitively.`
  );

  // JD_002: Moderate — 40–60% (only fires when JD_001 doesn't)
  check(
    "JD_002",
    coverage >= 0.4 && coverage < 0.6,
    `Keyword coverage is ${coveragePct}%. You're in the competitive range, but increasing to 70%+ will significantly improve ATS ranking.`
  );

  // ── Required and preferred skills ─────────────────────────────────────────

  const missingRequired = findMissingRequiredSkills(resume, jd, ctx);
  check(
    "JD_003",
    missingRequired.length > 0,
    `${missingRequired.length} required ${missingRequired.length === 1 ? "skill" : "skills"} from the job description ${missingRequired.length === 1 ? "is" : "are"} missing from your resume: ${formatList(missingRequired)}.`
  );
  // Cap the jd_match subscore only when every required skill is absent —
  // partial skill gaps warrant a penalty, not a hard ceiling.
  if (
    jd.required_skills.length > 0 &&
    missingRequired.length === jd.required_skills.length
  ) {
    triggeredCapRules.push(JD_MATCH_RULES_MAP["JD_003"]);
  }

  const missingPreferred = findMissingPreferredSkills(resume, jd, ctx);
  check(
    "JD_004",
    missingPreferred.length > 0,
    `${missingPreferred.length} preferred ${missingPreferred.length === 1 ? "skill" : "skills"} from the job description ${missingPreferred.length === 1 ? "is" : "are"} absent: ${formatList(missingPreferred)}. Adding these improves competitive positioning.`
  );

  // ── Experience alignment ──────────────────────────────────────────────────

  if (jd.required_experience_years !== null) {
    const candidateYears = estimateTotalExperienceYears(resume);
    const required = jd.required_experience_years;
    check(
      "JD_005",
      candidateYears < required,
      `The job requires ${required} years of experience. Your resume shows approximately ${candidateYears.toFixed(1)} years.`
    );
  }

  check(
    "JD_006",
    !hasTitleMatch(resume, jd),
    `None of your previous job titles closely match the target role "${jd.title ?? "specified position"}". Title alignment is a key ATS signal.`
  );

  // ── Education alignment ───────────────────────────────────────────────────

  check(
    "JD_007",
    !meetsEducationRequirement(resume, jd),
    `The job requires "${jd.required_education}". The highest education level detected in your resume does not appear to meet this requirement.`
  );

  // ── Keyword placement ─────────────────────────────────────────────────────

  const experienceDensity = calculateExperienceKeywordDensity(resume, jd, ctx);
  check(
    "JD_008",
    experienceDensity < 0.25,
    `Only ${Math.round(experienceDensity * 100)}% of JD keywords appear in your experience bullets. Weave target keywords naturally into achievement statements.`
  );

  const skillsCoverage = calculateSkillsKeywordCoverage(resume, jd, ctx);
  check(
    "JD_009",
    skillsCoverage === 0 && jd.keywords.length > 0,
    "None of the job description's key terms appear in your skills section. Add matching skills explicitly to improve ATS keyword scanning."
  );

  return buildEvaluatorResult("jd_match", violations, triggeredCapRules);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatList(items: string[], maxItems = 5): string {
  const shown = items.slice(0, maxItems);
  const remainder = items.length - shown.length;
  const base = shown.map((s) => `"${s}"`).join(", ");
  return remainder > 0 ? `${base} and ${remainder} more` : base;
}
