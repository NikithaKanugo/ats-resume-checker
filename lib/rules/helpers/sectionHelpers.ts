/**
 * sectionHelpers.ts
 *
 * Pure functions for checking section presence and completeness.
 * Also handles employment gap detection.
 */

import type { ResumeSchemaType } from "../../schemas/resumeSchema";
import type { ExperienceEntry, EducationEntry } from "../../../types/resume";

// ---------------------------------------------------------------------------
// Section presence
// ---------------------------------------------------------------------------

export function hasExperienceSection(resume: ResumeSchemaType): boolean {
  return resume.experience.length > 0;
}

export function hasEducationSection(resume: ResumeSchemaType): boolean {
  return resume.education.length > 0;
}

export function hasSkillsSection(resume: ResumeSchemaType): boolean {
  return resume.skills.raw_list.length > 0;
}

export function hasSummarySection(resume: ResumeSchemaType): boolean {
  return Boolean(resume.summary?.trim());
}

// ---------------------------------------------------------------------------
// Experience entry completeness — single-pass stats
// ---------------------------------------------------------------------------

/**
 * All experience-entry completeness checks in one pass over the array.
 * Each field contains the indices of entries that have that deficiency.
 */
export interface ExperienceStats {
  missingTitles: number[];
  missingCompany: number[];
  missingDates: number[];
  missingBullets: number[];
  tooFewBullets: number[];
}

export function computeExperienceStats(
  resume: ResumeSchemaType,
  minBullets = 2
): ExperienceStats {
  const stats: ExperienceStats = {
    missingTitles: [],
    missingCompany: [],
    missingDates: [],
    missingBullets: [],
    tooFewBullets: [],
  };

  for (let i = 0; i < resume.experience.length; i++) {
    const e = resume.experience[i];
    const hasTitle = Boolean(e.title?.trim());
    const hasCompany = Boolean(e.company?.trim());

    if (!hasTitle) stats.missingTitles.push(i);
    if (!hasCompany && hasTitle && e.bullets.length > 0) stats.missingCompany.push(i);
    if (!e.start_date && !e.end_date && !e.is_current && hasTitle && hasCompany) {
      stats.missingDates.push(i);
    }
    if (e.bullets.length === 0) stats.missingBullets.push(i);
    else if (e.bullets.length < minBullets) stats.tooFewBullets.push(i);
  }

  return stats;
}

// Kept for backward-compat with tests that import individual helpers directly
export function getEntriesMissingTitles(resume: ResumeSchemaType): ExperienceEntry[] {
  return computeExperienceStats(resume).missingTitles.map((i) => resume.experience[i]);
}
export function getEntriesMissingCompany(resume: ResumeSchemaType): ExperienceEntry[] {
  return computeExperienceStats(resume).missingCompany.map((i) => resume.experience[i]);
}
export function getEntriesMissingDates(resume: ResumeSchemaType): ExperienceEntry[] {
  return computeExperienceStats(resume).missingDates.map((i) => resume.experience[i]);
}
export function getEntriesMissingBullets(resume: ResumeSchemaType): ExperienceEntry[] {
  return computeExperienceStats(resume).missingBullets.map((i) => resume.experience[i]);
}
export function getEntriesWithTooFewBullets(resume: ResumeSchemaType, min = 2): ExperienceEntry[] {
  return computeExperienceStats(resume, min).tooFewBullets.map((i) => resume.experience[i]);
}

// ---------------------------------------------------------------------------
// Education entry completeness — single-pass stats
// ---------------------------------------------------------------------------

export interface EducationStats {
  missingInstitution: number[];
  missingDegree: number[];
}

export function computeEducationStats(resume: ResumeSchemaType): EducationStats {
  const stats: EducationStats = { missingInstitution: [], missingDegree: [] };
  for (let i = 0; i < resume.education.length; i++) {
    const e = resume.education[i];
    if (!e.institution?.trim()) stats.missingInstitution.push(i);
    if (!e.degree?.trim()) stats.missingDegree.push(i);
  }
  return stats;
}

export function getEducationMissingInstitution(resume: ResumeSchemaType): EducationEntry[] {
  return computeEducationStats(resume).missingInstitution.map((i) => resume.education[i]);
}
export function getEducationMissingDegree(resume: ResumeSchemaType): EducationEntry[] {
  return computeEducationStats(resume).missingDegree.map((i) => resume.education[i]);
}

// ---------------------------------------------------------------------------
// Document shape
// ---------------------------------------------------------------------------

/**
 * Rough page estimate: ~3000 characters per page.
 */
export function estimatePageCount(resume: ResumeSchemaType): number {
  return Math.ceil(resume.raw_text.length / 3000);
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Employment gap detection
// ---------------------------------------------------------------------------

/**
 * Returns true if any gap between consecutive roles exceeds `thresholdMonths`.
 * Skips entries with missing dates.
 */
export function hasEmploymentGap(
  resume: ResumeSchemaType,
  thresholdMonths = 6
): boolean {
  const dated = resume.experience
    .filter((e) => e.start_date && (e.end_date || e.is_current))
    .map((e) => ({
      start: parseApproximateDate(e.start_date!),
      end: e.is_current ? new Date() : parseApproximateDate(e.end_date!),
    }))
    .filter((e) => e.start && e.end)
    .sort((a, b) => b.start!.getTime() - a.start!.getTime()); // newest first

  for (let i = 0; i < dated.length - 1; i++) {
    const current = dated[i];
    const previous = dated[i + 1];
    if (!current.start || !previous.end) continue;

    const gapMonths = monthsBetween(previous.end, current.start);
    if (gapMonths > thresholdMonths) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Language checks
// ---------------------------------------------------------------------------

export function containsFirstPersonPronouns(text: string): boolean {
  return FIRST_PERSON_RE.test(text);
}

export function containsClichePhrases(text: string): boolean {
  const lower = text.toLowerCase();
  return CLICHE_PHRASES.some((phrase) => lower.includes(phrase));
}

const FIRST_PERSON_RE = /\b(I|my|me|we|our)\b/;

const CLICHE_PHRASES = [
  "team player",
  "self-motivated",
  "self motivated",
  "detail-oriented",
  "detail oriented",
  "hard worker",
  "hard-working",
  "think outside the box",
  "go-getter",
  "go getter",
  "results-driven",
  "results driven",
  "dynamic professional",
  "proactive",
  "synergy",
  "leverage",
  "passionate about",
  "proven track record",
];

// ---------------------------------------------------------------------------
// Date utilities
// ---------------------------------------------------------------------------

function parseApproximateDate(raw: string): Date | null {
  if (!raw) return null;
  const s = raw.trim();

  // "Jan 2021" / "January 2021"
  const monthYear = s.match(
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})$/i
  );
  if (monthYear) return new Date(`${monthYear[1]} 1, ${monthYear[2]}`);

  // "12/2024" (MM/YYYY)
  const mmYyyy = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmYyyy) return new Date(parseInt(mmYyyy[2]), parseInt(mmYyyy[1]) - 1, 1);

  // "12/24" (MM/YY) → interpret as 20YY
  const mmYy = s.match(/^(\d{1,2})\/(\d{2})$/);
  if (mmYy) return new Date(2000 + parseInt(mmYy[2]), parseInt(mmYy[1]) - 1, 1);

  // "2021"
  const yearOnly = s.match(/^(\d{4})$/);
  if (yearOnly) return new Date(`Jan 1, ${yearOnly[1]}`);

  // Month-only ("Jan") — no year, can't compute a gap
  if (/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?$/i.test(s)) return null;

  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function monthsBetween(earlier: Date, later: Date): number {
  return (
    (later.getFullYear() - earlier.getFullYear()) * 12 +
    (later.getMonth() - earlier.getMonth())
  );
}
