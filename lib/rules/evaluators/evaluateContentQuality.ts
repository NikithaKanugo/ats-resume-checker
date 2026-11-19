/**
 * evaluateContentQuality.ts
 *
 * Evaluates the impact and quality of resume content: action verbs,
 * quantified achievements, bullet length, language quality, and skills depth.
 */

import type { ResumeSchemaType } from "../../schemas/resumeSchema";
import type { EvaluatorResult, RuleViolation } from "../../../types/rules";
import { CONTENT_QUALITY_RULES_MAP } from "../definitions/contentQualityRules";
import {
  getIndexedBullets,
  countQuantifiedBullets,
  countWeakVerbs,
  countActionVerbBullets,
  countResponsibilityBullets,
  countLongBullets,
  countShortBullets,
  startsWithWeakVerb,
  startsWithResponsibilityPhrase,
  isQuantified,
} from "../helpers/bulletHelpers";
import {
  containsFirstPersonPronouns,
  containsClichePhrases,
  hasEmploymentGap,
} from "../helpers/sectionHelpers";
import { buildViolation, buildEvaluatorResult } from "./_buildResult";

export function evaluateContentQuality(
  resume: ResumeSchemaType
): EvaluatorResult {
  const violations: RuleViolation[] = [];

  function check(
    ruleId: string,
    condition: boolean,
    message: string,
    target?: { section?: string; text?: string }
  ): void {
    if (!condition) return;
    violations.push(buildViolation(CONTENT_QUALITY_RULES_MAP[ruleId], message, target));
  }

  // Single flatMap — derive plain bullet strings from indexed to avoid a second pass
  const indexed = getIndexedBullets(resume);
  const bullets = indexed.map((b) => b.text);
  const totalBullets = bullets.length;

  // ── Bullet quantity + risk assessment ──────────────────────────────────────
  //
  // Three tiers:
  //   zeroBulletRisk : experience text exists but 0 bullets extracted → penalty floor
  //   lowBulletRisk  : 1–2 bullets extracted → ratio rules fire with absolute counts
  //   normal         : 3+ bullets → ratio rules fire normally
  //

  const hasExperienceText = resume.experience.some(
    (e) => e.raw_text.trim().length > 50
  );
  const zeroBulletRisk = hasExperienceText && totalBullets === 0;
  const lowBulletRisk = totalBullets > 0 && totalBullets < 3;
  const hasEnoughBullets = totalBullets >= 3;

  // CONTENT_006: Too few total bullets
  check(
    "CONTENT_006",
    totalBullets < 6,
    `Only ${totalBullets} bullet ${totalBullets === 1 ? "point" : "points"} found across all experience entries. Aim for 3–6 per role.`,
    { section: "experience" }
  );

  // ── Zero-bullet penalty floor ─────────────────────────────────────────
  // When experience text exists but the parser extracted nothing, fire
  // CONTENT_003 and CONTENT_001 explicitly so the score reflects the
  // missing content rather than silently passing all ratio guards.

  if (zeroBulletRisk) {
    check(
      "CONTENT_003",
      true,
      "No structured bullet content was extracted from experience entries. ATS systems cannot evaluate content quality without bullet points.",
      { section: "experience" }
    );
    check(
      "CONTENT_001",
      true,
      "0% of experience content contains measurable results. No bullet points were available for evaluation.",
      { section: "experience" }
    );
  }

  // ── Action verbs (CONTENT_003) — fires for >0 bullets with no verbs ───
  if (!zeroBulletRisk) {
    const actionVerbCount = countActionVerbBullets(bullets);
    if (totalBullets > 0 && actionVerbCount === 0) {
      const first = indexed[0];
      check(
        "CONTENT_003",
        true,
        "No bullets begin with a recognized action verb. Each bullet should start with a strong past-tense verb (e.g., Led, Built, Reduced).",
        { section: `experience.${first?.entryIndex ?? 0}.bullets`, text: first?.text }
      );
    }
  }

  // ── Ratio-based rules ─────────────────────────────────────────────────
  // These fire normally when 3+ bullets exist.
  // For the 1–2 bullet case (lowBulletRisk) they fire with absolute-count
  // checks instead of ratios, so the guard can't silently bypass them.
  // For zero bullets they're covered by the floor above.

  // CONTENT_001: Too few quantified achievements
  if (!zeroBulletRisk && (hasEnoughBullets || lowBulletRisk)) {
    const quantifiedCount = countQuantifiedBullets(bullets);
    const quantifiedRatio = totalBullets > 0 ? quantifiedCount / totalBullets : 0;
    const threshold = hasEnoughBullets ? 0.25 : 0; // low-bullet: fire if literally zero quantified
    const firstUnquantified = indexed.find((b) => !isQuantified(b.text));
    check(
      "CONTENT_001",
      quantifiedRatio <= threshold,
      hasEnoughBullets
        ? `Only ${Math.round(quantifiedRatio * 100)}% of bullets contain measurable results. Aim for at least 25–40% of bullets to include numbers, percentages, or dollar amounts.`
        : `None of the ${totalBullets} bullet ${totalBullets === 1 ? "point" : "points"} contain measurable results. Add numbers, percentages, or dollar amounts.`,
      firstUnquantified
        ? { section: `experience.${firstUnquantified.entryIndex}.bullets`, text: firstUnquantified.text }
        : undefined
    );
  }

  // CONTENT_002: Excessive weak verbs
  if (hasEnoughBullets || lowBulletRisk) {
    const weakVerbCount = countWeakVerbs(bullets);
    const weakRatio = totalBullets > 0 ? weakVerbCount / totalBullets : 0;
    const threshold = hasEnoughBullets ? 0.3 : 0.5; // low-bullet: tolerate higher since sample is tiny
    const firstWeak = indexed.find((b) => startsWithWeakVerb(b.text));
    check(
      "CONTENT_002",
      weakRatio > threshold,
      `${Math.round(weakRatio * 100)}% of bullets start with weak or passive verbs (e.g., "helped", "assisted", "worked on"). Replace with strong action verbs.`,
      firstWeak
        ? { section: `experience.${firstWeak.entryIndex}.bullets`, text: firstWeak.text }
        : undefined
    );
  }

  // CONTENT_009: Responsibility-focused language
  if (hasEnoughBullets || lowBulletRisk) {
    const responsibilityCount = countResponsibilityBullets(bullets);
    const responsibilityRatio = totalBullets > 0 ? responsibilityCount / totalBullets : 0;
    const threshold = hasEnoughBullets ? 0.3 : 0.5;
    const firstResp = indexed.find((b) => startsWithResponsibilityPhrase(b.text));
    check(
      "CONTENT_009",
      responsibilityRatio > threshold,
      `${Math.round(responsibilityRatio * 100)}% of bullets describe responsibilities rather than achievements. Reframe as impact statements.`,
      firstResp
        ? { section: `experience.${firstResp.entryIndex}.bullets`, text: firstResp.text }
        : undefined
    );
  }

  // CONTENT_004: Bullets too long
  if (hasEnoughBullets || lowBulletRisk) {
    const longCount = countLongBullets(bullets, 200);
    const longRatio = totalBullets > 0 ? longCount / totalBullets : 0;
    const threshold = hasEnoughBullets ? 0.3 : 0.5;
    const firstLong = indexed.find((b) => b.text.length > 200);
    check(
      "CONTENT_004",
      longRatio > threshold,
      `${longCount} ${longCount === 1 ? "bullet" : "bullets"} exceed 200 characters. Overly long bullets reduce scannability. Aim for 100–180 characters.`,
      firstLong
        ? { section: `experience.${firstLong.entryIndex}.bullets`, text: firstLong.text }
        : undefined
    );
  }

  // CONTENT_005: Bullets too short
  if (hasEnoughBullets || lowBulletRisk) {
    const shortCount = countShortBullets(bullets, 40);
    const shortRatio = totalBullets > 0 ? shortCount / totalBullets : 0;
    const threshold = hasEnoughBullets ? 0.3 : 0.5;
    const firstShort = indexed.find((b) => b.text.length < 40);
    check(
      "CONTENT_005",
      shortRatio > threshold,
      `${shortCount} ${shortCount === 1 ? "bullet" : "bullets"} are fewer than 40 characters. Very short bullets lack context and keywords.`,
      firstShort
        ? { section: `experience.${firstShort.entryIndex}.bullets`, text: firstShort.text }
        : undefined
    );
  }

  // ── Language quality ──────────────────────────────────────────────────────

  check(
    "CONTENT_007",
    containsFirstPersonPronouns(resume.raw_text),
    'First-person pronouns ("I", "my", "me") were detected. Resumes should use third-person implicit style.'
  );

  check(
    "CONTENT_008",
    containsClichePhrases(resume.raw_text),
    'Overused clichés were detected (e.g., "team player", "detail-oriented", "results-driven"). Replace with specific accomplishments.'
  );

  // ── Skills quality ────────────────────────────────────────────────────────

  const skillCount = resume.skills.raw_list.length;
  check(
    "CONTENT_010",
    skillCount > 0 && skillCount < 5,
    `Only ${skillCount} ${skillCount === 1 ? "skill" : "skills"} listed. A competitive resume typically lists 8–15 relevant skills.`,
    { section: "skills" }
  );

  const hasTechnicalSkills = resume.skills.raw_list.some(isTechnicalSkill);
  check(
    "CONTENT_011",
    skillCount > 0 && !hasTechnicalSkills,
    "No technical or domain-specific skills were detected in the skills section. Add concrete tools, languages, frameworks, or platforms.",
    { section: "skills" }
  );

  // ── Employment gap ────────────────────────────────────────────────────────

  check(
    "CONTENT_012",
    hasEmploymentGap(resume, 6),
    "An employment gap of more than 6 months was detected. Consider addressing it with freelance work, education, or a brief explanation.",
    { section: "experience" }
  );

  return buildEvaluatorResult("content_quality", violations, []);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const TECHNICAL_SKILL_SIGNALS = [
  // Languages
  "javascript", "typescript", "python", "java", "go", "rust", "c++", "c#",
  "ruby", "swift", "kotlin", "scala", "php", "r", "sql",
  // Frameworks / runtimes
  "react", "next", "vue", "angular", "node", "rails", "django", "spring",
  "express", "fastapi", "laravel",
  // Cloud / infra
  "aws", "gcp", "azure", "docker", "kubernetes", "terraform", "ci/cd",
  // Databases
  "postgres", "mysql", "mongodb", "redis", "elasticsearch",
  // Tools
  "git", "github", "linux", "bash",
];

function isTechnicalSkill(skill: string): boolean {
  const lower = skill.toLowerCase();
  return TECHNICAL_SKILL_SIGNALS.some((signal) => lower.includes(signal));
}
