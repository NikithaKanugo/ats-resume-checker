/**
 * parseJobDescription.ts
 *
 * Converts raw job description text into a structured JobDescriptionSchemaType.
 * Uses heuristic extraction — no NLP required.
 *
 * This is a placeholder implementation with the correct shape.
 * Replace individual extractors with NLP/LLM calls as needed.
 */

import {
  JobDescriptionSchema,
  type JobDescriptionSchemaType,
} from "../schemas/jobDescriptionSchema";

export function parseJobDescription(rawText: string): JobDescriptionSchemaType {
  const jd: JobDescriptionSchemaType = {
    raw_text: rawText,
    title: extractTitle(rawText),
    company: extractCompany(rawText),
    required_skills: extractRequiredSkills(rawText),
    preferred_skills: extractPreferredSkills(rawText),
    required_experience_years: extractExperienceYears(rawText),
    required_education: extractEducationRequirement(rawText),
    responsibilities: extractResponsibilities(rawText),
    keywords: extractKeywords(rawText),
  };

  return JobDescriptionSchema.parse(jd);
}

// ---------------------------------------------------------------------------
// Extractors
// ---------------------------------------------------------------------------

function extractTitle(text: string): string | null {
  // Common formats: first non-empty line, or line after "Job Title:"
  const explicit = text.match(/(?:job\s+title|position|role)[:\s]+(.+)/i);
  if (explicit) return explicit[1].trim();
  const firstLine = text.split("\n").map((l) => l.trim()).find(Boolean);
  return firstLine ?? null;
}

function extractCompany(text: string): string | null {
  const match = text.match(/(?:company|employer|organization)[:\s]+(.+)/i);
  return match ? match[1].trim() : null;
}

function extractRequiredSkills(text: string): string[] {
  return extractSkillsFromSection(text, /required/i);
}

function extractPreferredSkills(text: string): string[] {
  return extractSkillsFromSection(text, /preferred|nice.to.have|bonus|plus/i);
}

function extractSkillsFromSection(text: string, sectionRe: RegExp): string[] {
  const lines = text.split("\n");
  const skills: string[] = [];
  let inSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (sectionRe.test(trimmed) && trimmed.length < 60) {
      inSection = true;
      continue;
    }
    // Stop collecting on the next section header
    if (inSection && isSectionHeader(trimmed)) break;
    if (inSection && trimmed) {
      const extracted = extractSkillsFromLine(trimmed);
      skills.push(...extracted);
    }
  }

  return [...new Set(skills)];
}

function extractSkillsFromLine(line: string): string[] {
  // Strip bullet markers
  const clean = line.replace(/^[•·\-*>]\s*/, "");
  // Split on common delimiters
  return clean
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 50);
}

function extractExperienceYears(text: string): number | null {
  const match = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience/i);
  return match ? parseInt(match[1], 10) : null;
}

function extractEducationRequirement(text: string): string | null {
  const match = text.match(
    /(bachelor'?s?|master'?s?|ph\.?d\.?|associate'?s?|b\.?s\.?|m\.?s\.?|mba)[^.\n]*/i
  );
  return match ? match[0].trim() : null;
}

function extractResponsibilities(text: string): string[] {
  const lines = text.split("\n");
  const results: string[] = [];
  let inSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/responsibilit|duties|what you.ll do|role overview/i.test(trimmed) && trimmed.length < 60) {
      inSection = true;
      continue;
    }
    if (inSection && isSectionHeader(trimmed)) break;
    if (inSection && /^[•·\-*>]/.test(trimmed)) {
      results.push(trimmed.replace(/^[•·\-*>\s]+/, ""));
    }
  }

  return results;
}

/**
 * Extract all meaningful keywords from the JD for coverage analysis.
 * Combines explicit skills, title tokens, and high-frequency domain terms.
 */
export function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const words = lower.split(/\W+/).filter((w) => w.length > 2);

  // Remove stopwords
  const filtered = words.filter((w) => !STOPWORDS.has(w));

  // Deduplicate and return top terms (frequency-sorted)
  const freq: Record<string, number> = {};
  for (const w of filtered) freq[w] = (freq[w] ?? 0) + 1;

  return Object.entries(freq)
    .filter(([, count]) => count >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 40)
    .map(([word]) => word);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function isSectionHeader(line: string): boolean {
  return line.length > 0 && line.length < 60 && /^[A-Z]/.test(line) && !/[,.]/.test(line);
}

const STOPWORDS = new Set([
  "the", "and", "for", "are", "with", "you", "will", "our", "your",
  "have", "this", "that", "from", "they", "what", "about", "into",
  "also", "their", "can", "not", "but", "all", "been", "more",
  "who", "we", "an", "in", "of", "to", "a", "is", "it", "as",
  "at", "be", "by", "do", "if", "or", "on", "up", "us",
]);
