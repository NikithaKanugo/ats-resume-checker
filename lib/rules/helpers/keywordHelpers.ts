/**
 * keywordHelpers.ts
 *
 * Pure functions for keyword extraction and coverage analysis.
 * Used exclusively by evaluateJobMatch.ts.
 *
 * All matching now goes through the normalization + synonym layer
 * in skillNormalization.ts so "React.js" matches "React", "PostgreSQL"
 * matches "Postgres", etc.
 */

import type { ResumeSchemaType } from "../../schemas/resumeSchema";
import type { JobDescriptionSchemaType } from "../../schemas/jobDescriptionSchema";
import type { GapReport } from "../../../types/analysis";
import { matchesNormalized, normalizeSkill } from "./skillNormalization";

// ---------------------------------------------------------------------------
// Keyword coverage (primary metric)
// ---------------------------------------------------------------------------

/**
 * Pre-computed search texts for a resume.  Built once per analysis,
 * then passed to all coverage / gap / missing-skill functions.
 */
export interface ResumeSearchContext {
  /** Full resume text (raw + normalized skills), lowercased. */
  full: string;
  /** Experience bullet text only, lowercased. */
  experience: string;
  /** Skills section only (normalized), lowercased. */
  skills: string;
}

export function buildSearchContext(resume: ResumeSchemaType): ResumeSearchContext {
  return {
    full: buildResumeSearchText(resume),
    experience: resume.experience.flatMap((e) => e.bullets).join(" ").toLowerCase(),
    skills: resume.skills.raw_list.map((s) => normalizeSkill(s)).join(" "),
  };
}

/**
 * Returns the fraction (0–1) of JD keywords found anywhere in the resume.
 * Matching is case-insensitive, synonym-aware, and handles tech naming variants.
 */
export function calculateKeywordCoverage(
  resume: ResumeSchemaType,
  jd: JobDescriptionSchemaType,
  ctx?: ResumeSearchContext
): number {
  if (jd.keywords.length === 0) return 1;
  const text = ctx?.full ?? buildResumeSearchText(resume);
  return jd.keywords.filter((kw) => matchesNormalized(text, kw)).length / jd.keywords.length;
}

/**
 * Returns the fraction of JD keywords found specifically in the
 * experience section bullets.
 */
export function calculateExperienceKeywordDensity(
  resume: ResumeSchemaType,
  jd: JobDescriptionSchemaType,
  ctx?: ResumeSearchContext
): number {
  if (jd.keywords.length === 0) return 1;
  const text = ctx?.experience ?? resume.experience.flatMap((e) => e.bullets).join(" ").toLowerCase();
  return jd.keywords.filter((kw) => matchesNormalized(text, kw)).length / jd.keywords.length;
}

/**
 * Returns the fraction of JD keywords found in the skills section only.
 */
export function calculateSkillsKeywordCoverage(
  resume: ResumeSchemaType,
  jd: JobDescriptionSchemaType,
  ctx?: ResumeSearchContext
): number {
  if (jd.keywords.length === 0) return 1;
  const text = ctx?.skills ?? resume.skills.raw_list.map((s) => normalizeSkill(s)).join(" ");
  return jd.keywords.filter((kw) => matchesNormalized(text, kw)).length / jd.keywords.length;
}

// ---------------------------------------------------------------------------
// Gap report (resume vs. JD diff)
// ---------------------------------------------------------------------------

/**
 * Builds a structured gap report comparing resume content against a JD.
 * Called by the JD-mode orchestrator after evaluation to attach structured
 * diff data to the AnalysisResult without coupling it to EvaluatorResult.
 */
export function buildGapReport(
  resume: ResumeSchemaType,
  jd: JobDescriptionSchemaType,
  ctx?: ResumeSearchContext
): GapReport {
  const text = ctx?.full ?? buildResumeSearchText(resume);

  const foundRequired = jd.required_skills.filter((s) => matchesNormalized(text, s));
  const missingRequired = jd.required_skills.filter((s) => !matchesNormalized(text, s));
  const foundPreferred = jd.preferred_skills.filter((s) => matchesNormalized(text, s));
  const missingPreferred = jd.preferred_skills.filter((s) => !matchesNormalized(text, s));
  const foundKeywords = jd.keywords.filter((kw) => matchesNormalized(text, kw));
  const missingKeywords = jd.keywords.filter((kw) => !matchesNormalized(text, kw));

  const keywordCoveragePct =
    jd.keywords.length > 0
      ? Math.round((foundKeywords.length / jd.keywords.length) * 100)
      : 100;

  return {
    found_required: foundRequired,
    missing_required: missingRequired,
    found_preferred: foundPreferred,
    missing_preferred: missingPreferred,
    found_keywords: foundKeywords,
    missing_keywords: missingKeywords,
    keyword_coverage_pct: keywordCoveragePct,
  };
}

// ---------------------------------------------------------------------------
// Missing skills
// ---------------------------------------------------------------------------

export function findMissingRequiredSkills(
  resume: ResumeSchemaType,
  jd: JobDescriptionSchemaType,
  ctx?: ResumeSearchContext
): string[] {
  const text = ctx?.full ?? buildResumeSearchText(resume);
  return jd.required_skills.filter((skill) => !matchesNormalized(text, skill));
}

export function findMissingPreferredSkills(
  resume: ResumeSchemaType,
  jd: JobDescriptionSchemaType,
  ctx?: ResumeSearchContext
): string[] {
  const text = ctx?.full ?? buildResumeSearchText(resume);
  return jd.preferred_skills.filter((skill) => !matchesNormalized(text, skill));
}

// ---------------------------------------------------------------------------
// Experience years
// ---------------------------------------------------------------------------

/**
 * Estimate total years of professional experience from dated entries.
 * Overlapping date ranges are not de-duped (conservative estimate).
 */
export function estimateTotalExperienceYears(
  resume: ResumeSchemaType
): number {
  let totalMonths = 0;

  for (const entry of resume.experience) {
    const start = parseApproximateDate(entry.start_date);
    const end = entry.is_current
      ? new Date()
      : parseApproximateDate(entry.end_date);

    if (!start || !end) continue;

    const months =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());

    if (months > 0) totalMonths += months;
  }

  return totalMonths / 12;
}

// ---------------------------------------------------------------------------
// Title matching
// ---------------------------------------------------------------------------

/**
 * Returns true if any past job title has meaningful overlap with the JD title.
 * Uses token intersection with synonym awareness.
 */
export function hasTitleMatch(
  resume: ResumeSchemaType,
  jd: JobDescriptionSchemaType
): boolean {
  if (!jd.title) return true; // no target title to match

  const jdTokens = tokenize(jd.title);
  return resume.experience.some((entry) => {
    if (!entry.title) return false;
    const entryText = entry.title.toLowerCase();
    // Check if any meaningful JD title token appears in the resume title
    return jdTokens
      .filter((t) => t.length > 3)
      .some((t) => matchesNormalized(entryText, t));
  });
}

// ---------------------------------------------------------------------------
// Education requirement
// ---------------------------------------------------------------------------

const DEGREE_RANK: Record<string, number> = {
  "high school": 1,
  ged: 1,
  associate: 2,
  "associate's": 2,
  bachelor: 3,
  "bachelor's": 3,
  "b.s.": 3,
  "b.a.": 3,
  bs: 3,
  ba: 3,
  master: 4,
  "master's": 4,
  "m.s.": 4,
  mba: 4,
  phd: 5,
  "ph.d.": 5,
  doctorate: 5,
};

/**
 * Returns true if the candidate meets or exceeds the required education level.
 * Returns true when the JD specifies no education requirement.
 */
export function meetsEducationRequirement(
  resume: ResumeSchemaType,
  jd: JobDescriptionSchemaType
): boolean {
  if (!jd.required_education) return true;

  const requiredRank = resolveRank(jd.required_education);
  if (requiredRank === 0) return true; // unrecognized requirement — don't penalize

  const highestCandidateRank = resume.education.reduce((max, entry) => {
    const rank = resolveRank(entry.degree ?? "");
    return rank > max ? rank : max;
  }, 0);

  return highestCandidateRank >= requiredRank;
}

function resolveRank(text: string): number {
  const lower = text.toLowerCase();
  for (const [key, rank] of Object.entries(DEGREE_RANK)) {
    if (lower.includes(key)) return rank;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Private utilities
// ---------------------------------------------------------------------------

function buildResumeSearchText(resume: ResumeSchemaType): string {
  const parts = [
    resume.raw_text,
    resume.skills.raw_list.map((s) => normalizeSkill(s)).join(" "),
    ...Object.values(resume.skills.categories).flat().map((s) => normalizeSkill(s)),
  ];
  return parts.join(" ").toLowerCase();
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(Boolean);
}

function parseApproximateDate(raw: string | null): Date | null {
  if (!raw) return null;
  const s = raw.trim();

  const monthYear = s.match(
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})$/i
  );
  if (monthYear) return new Date(`${monthYear[1]} 1, ${monthYear[2]}`);

  const mmYyyy = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmYyyy) return new Date(parseInt(mmYyyy[2]), parseInt(mmYyyy[1]) - 1, 1);

  const mmYy = s.match(/^(\d{1,2})\/(\d{2})$/);
  if (mmYy) return new Date(2000 + parseInt(mmYy[2]), parseInt(mmYy[1]) - 1, 1);

  const yearOnly = s.match(/^(\d{4})$/);
  if (yearOnly) return new Date(`Jan 1, ${yearOnly[1]}`);

  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}
