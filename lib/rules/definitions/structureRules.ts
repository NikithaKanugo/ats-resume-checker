/**
 * structureRules.ts
 *
 * Rules that measure resume organization: required sections, completeness of
 * entries, date coverage, and overall document shape.
 *
 * Category weight: 30 pts (resume-only) | 20 pts (resume + JD)
 */

import type { RuleDefinition } from "../../../types/rules";

export const STRUCTURE_RULES: RuleDefinition[] = [
  // ── Required sections ────────────────────────────────────────────────────
  {
    id: "STRUCT_001",
    title: "Missing Experience Section",
    description:
      "No experience section was detected. This is the most critical section for ATS ranking.",
    category: "structure",
    severity: "critical",
    scoreImpact: 40,
    isCap: true,
    capValue: 40,
  },
  {
    id: "STRUCT_002",
    title: "Missing Education Section",
    description:
      "No education section was detected. Many job postings filter by education level.",
    category: "structure",
    severity: "high",
    scoreImpact: 20,
    isCap: true,
    capValue: 70,
  },
  {
    id: "STRUCT_003",
    title: "Missing Skills Section",
    description:
      "No skills section was detected. ATS systems rely heavily on skills keywords for matching.",
    category: "structure",
    severity: "high",
    scoreImpact: 20,
  },

  // ── Experience entry completeness ─────────────────────────────────────────
  {
    id: "STRUCT_004",
    title: "Experience Entries Missing Job Titles",
    description:
      "One or more experience entries are missing a job title. Titles are required for ATS parsing.",
    category: "structure",
    severity: "high",
    scoreImpact: 15,
  },
  {
    id: "STRUCT_005",
    title: "Experience Entries Missing Company Names",
    description:
      "One or more experience entries are missing a company name.",
    category: "structure",
    severity: "high",
    scoreImpact: 15,
  },
  {
    id: "STRUCT_006",
    title: "Experience Entries Missing Dates",
    description:
      "One or more experience entries are missing start or end dates. Dates are required for ATS and recruiters.",
    category: "structure",
    severity: "medium",
    scoreImpact: 10,
  },
  {
    id: "STRUCT_007",
    title: "No Bullet Points in Experience",
    description:
      "Experience entries contain no bullet points. ATS systems and recruiters expect achievements listed as bullets.",
    category: "structure",
    severity: "high",
    scoreImpact: 20,
  },
  {
    id: "STRUCT_008",
    title: "Too Few Bullets Per Role",
    description:
      "One or more experience entries have fewer than 2 bullet points. Each role should have 3–6 bullets.",
    category: "structure",
    severity: "medium",
    scoreImpact: 10,
  },

  // ── Education entry completeness ──────────────────────────────────────────
  {
    id: "STRUCT_009",
    title: "Education Entries Missing Institution Name",
    description:
      "One or more education entries are missing the institution name.",
    category: "structure",
    severity: "medium",
    scoreImpact: 10,
  },
  {
    id: "STRUCT_010",
    title: "Education Entries Missing Degree",
    description:
      "One or more education entries are missing the degree or qualification.",
    category: "structure",
    severity: "medium",
    scoreImpact: 10,
  },

  // ── Document shape ────────────────────────────────────────────────────────
  {
    id: "STRUCT_011",
    title: "Resume Exceeds Two Pages",
    description:
      "The resume appears to exceed two pages based on content length. Most ATS systems and recruiters prefer ≤2 pages.",
    category: "structure",
    severity: "medium",
    scoreImpact: 10,
  },
  {
    id: "STRUCT_012",
    title: "Missing Summary or Objective",
    description:
      "No professional summary or objective was found. A summary helps ATS systems and recruiters quickly qualify the candidate.",
    category: "structure",
    severity: "low",
    scoreImpact: 5,
  },
  {
    id: "STRUCT_013",
    title: "Single Experience Entry Only",
    description:
      "Only one job is listed in the experience section. Candidates with only one role should still present it with full detail.",
    category: "structure",
    severity: "low",
    scoreImpact: 5,
  },
];

export const STRUCTURE_RULES_MAP: Record<string, RuleDefinition> =
  Object.fromEntries(STRUCTURE_RULES.map((r) => [r.id, r]));
