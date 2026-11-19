/**
 * contentQualityRules.ts
 *
 * Rules that measure the quality and impact of resume content: action verbs,
 * quantified achievements, bullet length, clichés, and first-person language.
 *
 * Category weight: 40 pts (resume-only) | 20 pts (resume + JD)
 */

import type { RuleDefinition } from "../../../types/rules";

export const CONTENT_QUALITY_RULES: RuleDefinition[] = [
  // ── Bullet point quality ──────────────────────────────────────────────────
  {
    id: "CONTENT_001",
    title: "Too Few Quantified Achievements",
    description:
      "Fewer than 25% of experience bullets contain measurable results (numbers, percentages, dollar amounts). Quantified achievements significantly improve ATS scoring.",
    category: "content_quality",
    severity: "high",
    scoreImpact: 20,
  },
  {
    id: "CONTENT_002",
    title: "Excessive Use of Weak Verbs",
    description:
      "More than 30% of bullets begin with weak or passive verbs (e.g., 'helped', 'assisted', 'worked on', 'responsible for'). Use strong action verbs instead.",
    category: "content_quality",
    severity: "high",
    scoreImpact: 15,
  },
  {
    id: "CONTENT_003",
    title: "No Action Verbs Detected",
    description:
      "Experience bullets do not start with action verbs. ATS systems and recruiters expect each bullet to begin with a past-tense action verb.",
    category: "content_quality",
    severity: "critical",
    scoreImpact: 25,
  },
  {
    id: "CONTENT_004",
    title: "Bullet Points Too Long",
    description:
      "More than 30% of bullets exceed 200 characters. Overly long bullets reduce scannability. Aim for 100–180 characters per bullet.",
    category: "content_quality",
    severity: "medium",
    scoreImpact: 10,
  },
  {
    id: "CONTENT_005",
    title: "Bullet Points Too Short",
    description:
      "More than 30% of bullets are fewer than 40 characters. Very short bullets lack sufficient context and keywords.",
    category: "content_quality",
    severity: "medium",
    scoreImpact: 10,
  },
  {
    id: "CONTENT_006",
    title: "Too Few Total Bullets",
    description:
      "The resume contains fewer than 6 bullet points across all experience entries. Expand on each role with 3–6 achievement-focused bullets.",
    category: "content_quality",
    severity: "high",
    scoreImpact: 15,
  },

  // ── Language quality ──────────────────────────────────────────────────────
  {
    id: "CONTENT_007",
    title: "First-Person Pronouns Detected",
    description:
      "The resume uses first-person pronouns ('I', 'my', 'me', 'we'). Resumes should be written in third-person implicit style.",
    category: "content_quality",
    severity: "medium",
    scoreImpact: 10,
  },
  {
    id: "CONTENT_008",
    title: "Cliché or Overused Phrases",
    description:
      "The resume contains overused clichés (e.g., 'team player', 'self-motivated', 'detail-oriented', 'think outside the box'). Replace with specific accomplishments.",
    category: "content_quality",
    severity: "low",
    scoreImpact: 8,
  },
  {
    id: "CONTENT_009",
    title: "Responsibility-Focused Language",
    description:
      "Many bullets describe responsibilities rather than achievements (e.g., 'responsible for', 'duties included'). Reframe as impact statements.",
    category: "content_quality",
    severity: "high",
    scoreImpact: 15,
  },

  // ── Skills quality ────────────────────────────────────────────────────────
  {
    id: "CONTENT_010",
    title: "Too Few Skills Listed",
    description:
      "Fewer than 5 skills were detected. A competitive resume typically lists 8–15 relevant technical and soft skills.",
    category: "content_quality",
    severity: "medium",
    scoreImpact: 10,
  },
  {
    id: "CONTENT_011",
    title: "Skills Section Contains Only Soft Skills",
    description:
      "No technical or domain-specific skills were detected. Include concrete tools, languages, frameworks, or platforms.",
    category: "content_quality",
    severity: "medium",
    scoreImpact: 10,
  },

  // ── Dates and gaps ────────────────────────────────────────────────────────
  {
    id: "CONTENT_012",
    title: "Employment Gap Detected",
    description:
      "A gap of more than 6 months between experience entries was detected. Consider addressing gaps with freelance work, education, or a brief explanation.",
    category: "content_quality",
    severity: "low",
    scoreImpact: 5,
  },
];

export const CONTENT_QUALITY_RULES_MAP: Record<string, RuleDefinition> =
  Object.fromEntries(CONTENT_QUALITY_RULES.map((r) => [r.id, r]));
