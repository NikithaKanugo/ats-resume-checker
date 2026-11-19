/**
 * bulletHelpers.ts
 *
 * Pure functions for extracting and analyzing bullet points across experience entries.
 * No imports from evaluators or scoring — helpers only.
 */

import type { ResumeSchemaType } from "../../schemas/resumeSchema";

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

/**
 * Flatten all bullet strings across every experience entry.
 */
export function getAllBullets(resume: ResumeSchemaType): string[] {
  return resume.experience.flatMap((entry) => entry.bullets);
}

export interface IndexedBullet {
  text: string;
  entryIndex: number;
}

/**
 * Flatten bullets with their parent entry index so evaluators can point
 * violations at specific experience entries and bullet text.
 */
export function getIndexedBullets(resume: ResumeSchemaType): IndexedBullet[] {
  return resume.experience.flatMap((entry, i) =>
    entry.bullets.map((text) => ({ text, entryIndex: i }))
  );
}

// ---------------------------------------------------------------------------
// Quantification
// ---------------------------------------------------------------------------

/**
 * Count bullets that contain at least one measurable result:
 * numbers, percentages, currency, or multipliers.
 *
 * Examples that pass: "Reduced latency by 40%", "Managed $2M budget", "Grew team 3x"
 */
export function countQuantifiedBullets(bullets: string[]): number {
  return bullets.filter(isQuantified).length;
}

export function isQuantified(bullet: string): boolean {
  return QUANTIFICATION_RE.test(bullet);
}

const QUANTIFICATION_RE =
  /\d+%|\$\s*\d|\d+\s*x\b|\d+\s*(million|billion|k\b|thousand)|increased|decreased|reduced|grew|saved|generated|\d{2,}/i;

// ---------------------------------------------------------------------------
// Weak verbs
// ---------------------------------------------------------------------------

/**
 * Count bullets that begin with a weak, passive, or duty-describing verb.
 */
export function countWeakVerbs(bullets: string[]): number {
  return bullets.filter(startsWithWeakVerb).length;
}

export function startsWithWeakVerb(bullet: string): boolean {
  const firstWord = bullet.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return WEAK_VERBS.has(firstWord);
}

/**
 * Verbs that indicate responsibility-listing rather than achievement-stating.
 */
export const WEAK_VERBS: Set<string> = new Set([
  "helped",
  "assisted",
  "supported",
  "worked",
  "participated",
  "involved",
  "responsible",
  "handled",
  "tasked",
  "assigned",
  "performed",
  "did",
  "made",
  "used",
  "utilized",
  "employed",
  "served",
  "contributed",
]);

// ---------------------------------------------------------------------------
// Action verbs
// ---------------------------------------------------------------------------

/**
 * Return true if the bullet starts with a recognized strong action verb.
 */
export function startsWithActionVerb(bullet: string): boolean {
  const firstWord = bullet.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return ACTION_VERBS.has(firstWord);
}

export function countActionVerbBullets(bullets: string[]): number {
  return bullets.filter(startsWithActionVerb).length;
}

export const ACTION_VERBS: Set<string> = new Set([
  "accelerated", "achieved", "administered", "architected", "automated",
  "built", "coached", "collaborated", "created", "cut",
  "delivered", "deployed", "designed", "developed", "directed",
  "drove", "engineered", "established", "executed", "expanded",
  "generated", "grew", "implemented", "improved", "increased",
  "integrated", "launched", "led", "managed", "mentored",
  "migrated", "optimized", "orchestrated", "overhauled", "owned",
  "partnered", "pioneered", "reduced", "refactored", "resolved",
  "scaled", "secured", "shipped", "simplified", "spearheaded",
  "streamlined", "transformed", "unified", "upgraded",
]);

// ---------------------------------------------------------------------------
// Responsibility language
// ---------------------------------------------------------------------------

/**
 * Detect bullets that describe duties rather than accomplishments.
 */
export function startsWithResponsibilityPhrase(bullet: string): boolean {
  const lower = bullet.trim().toLowerCase();
  return RESPONSIBILITY_PHRASES.some((phrase) => lower.startsWith(phrase));
}

export function countResponsibilityBullets(bullets: string[]): number {
  return bullets.filter(startsWithResponsibilityPhrase).length;
}

const RESPONSIBILITY_PHRASES = [
  "responsible for",
  "duties included",
  "duties include",
  "in charge of",
  "tasked with",
  "job was to",
  "role was to",
];

// ---------------------------------------------------------------------------
// Length analysis
// ---------------------------------------------------------------------------

export function countLongBullets(bullets: string[], maxChars = 200): number {
  return bullets.filter((b) => b.length > maxChars).length;
}

export function countShortBullets(bullets: string[], minChars = 40): number {
  return bullets.filter((b) => b.length < minChars).length;
}
