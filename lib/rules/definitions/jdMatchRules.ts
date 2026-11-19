/**
 * jdMatchRules.ts
 *
 * Rules that measure alignment between the resume and a provided job description.
 * Only evaluated when scoring_mode === "resume_and_jd".
 *
 * Category weight: 40 pts (resume + JD only — not applicable in resume-only mode)
 */

import type { RuleDefinition } from "../../../types/rules";

export const JD_MATCH_RULES: RuleDefinition[] = [
  // ── Keyword coverage ──────────────────────────────────────────────────────
  {
    id: "JD_001",
    title: "Low Overall Keyword Coverage",
    description:
      "Fewer than 40% of keywords extracted from the job description appear in the resume. ATS systems score heavily on keyword overlap.",
    category: "jd_match",
    severity: "critical",
    scoreImpact: 30,
  },
  {
    id: "JD_002",
    title: "Moderate Keyword Coverage",
    description:
      "Between 40–60% of job description keywords appear in the resume. Aim for at least 70% coverage to rank competitively.",
    category: "jd_match",
    severity: "high",
    scoreImpact: 15,
  },

  // ── Required skills ───────────────────────────────────────────────────────
  {
    id: "JD_003",
    title: "Missing Required Skills",
    description:
      "One or more skills explicitly marked as required in the job description are absent from the resume.",
    category: "jd_match",
    severity: "critical",
    scoreImpact: 25,
    // Cap only applies when ALL required skills are missing (enforced in evaluator).
    isCap: true,
    capValue: 30,
  },
  {
    id: "JD_004",
    title: "Missing Preferred Skills",
    description:
      "One or more preferred (nice-to-have) skills from the job description are missing from the resume. Adding these improves competitive ranking.",
    category: "jd_match",
    severity: "medium",
    scoreImpact: 10,
  },

  // ── Experience alignment ──────────────────────────────────────────────────
  {
    id: "JD_005",
    title: "Experience Years Below Requirement",
    description:
      "The candidate's total years of experience appear to be below the minimum required by the job description.",
    category: "jd_match",
    severity: "high",
    scoreImpact: 20,
  },
  {
    id: "JD_006",
    title: "Job Title Mismatch",
    description:
      "None of the candidate's previous job titles closely match the target job title in the posting. Title alignment affects ATS ranking.",
    category: "jd_match",
    severity: "medium",
    scoreImpact: 10,
  },

  // ── Education alignment ───────────────────────────────────────────────────
  {
    id: "JD_007",
    title: "Education Requirement Not Met",
    description:
      "The job description specifies a minimum education level (e.g., Bachelor's) that does not appear to be met by the candidate's education section.",
    category: "jd_match",
    severity: "high",
    scoreImpact: 15,
  },

  // ── Keyword density ───────────────────────────────────────────────────────
  {
    id: "JD_008",
    title: "Low Keyword Density in Experience Section",
    description:
      "JD keywords appear infrequently in experience bullets. Weave target keywords naturally into achievement statements.",
    category: "jd_match",
    severity: "medium",
    scoreImpact: 10,
  },
  {
    id: "JD_009",
    title: "No JD Keywords in Skills Section",
    description:
      "None of the top keywords from the job description appear in the resume's skills section. Add matching skills explicitly.",
    category: "jd_match",
    severity: "high",
    scoreImpact: 15,
  },
];

export const JD_MATCH_RULES_MAP: Record<string, RuleDefinition> =
  Object.fromEntries(JD_MATCH_RULES.map((r) => [r.id, r]));
