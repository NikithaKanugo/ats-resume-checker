/**
 * parseResume.ts
 *
 * Top-level parsing orchestrator. Drives the pipeline:
 *   extractText → detectSections → parse each section → validate against ResumeSchema
 *
 * Sub-parsers (contact, experience, education, skills) live here as private functions.
 * Each sub-parser is pure: string in → typed object out.
 */

import { ResumeSchema, type ResumeSchemaType } from "../schemas/resumeSchema";
import { detectFormat, extractText, type FileFormat } from "./extractText";
import { detectSections } from "./detectSections";
import { log } from "../utils/logger";

// ---------------------------------------------------------------------------
// Parse trace — tracks which fallbacks were activated during a parse pass.
// Reset at the start of each buildResumeFromText call.
// ---------------------------------------------------------------------------

interface SplitDecision {
  line: string;
  action: "split" | "absorb";
  reason: string;
}

interface ParseTrace {
  experienceHeaderFallback: boolean;
  paragraphToBulletFallback: boolean;
  educationGroupingFallback: boolean;
  linkedinBareWordFallback: boolean;
  /** Debug log of entry boundary decisions made during splitting. */
  experienceSplitLog: SplitDecision[];
}

let _trace: ParseTrace = freshTrace();

function freshTrace(): ParseTrace {
  return {
    experienceHeaderFallback: false,
    paragraphToBulletFallback: false,
    educationGroupingFallback: false,
    linkedinBareWordFallback: false,
    experienceSplitLog: [],
  };
}
import type {
  ContactInfo,
  ExperienceEntry,
  EducationEntry,
  SkillsSection,
} from "../../types/resume";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ParseResumeInput {
  buffer: Buffer;
  filename: string;
}

export async function parseResume(input: ParseResumeInput): Promise<ResumeSchemaType> {
  const format = detectFormat(input.filename);
  const rawText = await extractText(input.buffer, format);
  return buildResumeFromText(rawText, format);
}

/**
 * Exposed for testing without a file buffer.
 */
export function buildResumeFromText(
  rawText: string,
  format: FileFormat = "txt"
): ResumeSchemaType {
  // Reset trace for this parse pass
  _trace = freshTrace();

  const { sections, detectedSectionNames, warnings } =
    detectSections(rawText);

  // Sub-parsers are individually wrapped so one failure doesn't crash the
  // entire pipeline — the remaining sections still parse successfully.
  const contact = safeParse("contact", () => parseContact(sections.contact ?? "", rawText), {
    name: null, email: null, phone: null,
    linkedin: null, github: null, location: null,
  }, warnings);

  const experience = safeParse("experience", () => parseExperience(sections.experience ?? ""), [], warnings);
  const education = safeParse("education", () => parseEducation(sections.education ?? ""), [], warnings);
  const skills = safeParse("skills", () => parseSkills(sections.skills ?? ""), { raw_list: [], categories: {} }, warnings);

  const parsed = { contact, experience, education, skills };

  const resume: ResumeSchemaType = {
    contact,
    summary: sections.summary?.trim() ?? null,
    experience,
    education,
    skills,
    certifications: parseCertifications(sections.certifications ?? ""),
    projects: parseProjects(sections.projects ?? ""),
    raw_text: rawText,
    parse_metadata: {
      source_format: format,
      parse_confidence: deriveParseConfidence(detectedSectionNames, warnings, parsed),
      char_count: rawText.length,
      page_count: null,
      detected_sections: detectedSectionNames,
      parse_warnings: warnings,
      section_confidence: deriveSectionConfidence(detectedSectionNames, parsed),
      fallbacks_used: {
        experience_header_fallback: _trace.experienceHeaderFallback,
        paragraph_to_bullet_fallback: _trace.paragraphToBulletFallback,
        education_grouping_fallback: _trace.educationGroupingFallback,
        linkedin_bare_word_fallback: _trace.linkedinBareWordFallback,
        experience_split_log: _trace.experienceSplitLog,
      },
    },
  };

  return ResumeSchema.parse(resume);
}

/**
 * Wraps a sub-parser in a try/catch.  On failure, logs the error,
 * pushes a parse warning, and returns the safe fallback value.
 */
function safeParse<T>(
  section: string,
  fn: () => T,
  fallback: T,
  warnings: string[]
): T {
  try {
    return fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error("sub_parser_failed", { section, error: msg });
    warnings.push(`Parser fallback: ${section} section could not be parsed — ${msg}`);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Contact parser
// ---------------------------------------------------------------------------

function parseContact(block: string, fullText = ""): ContactInfo {
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

  // For URL fields, search the contact block first, then fall back to full text.
  const findUrl = (re: RegExp) =>
    extractPattern(block, re) ?? extractPattern(fullText, re);

  // When the PDF renders a hyperlink as display text only (e.g. "linkedin" with
  // no URL in the extracted characters), fall back to detecting the bare word.
  const findLinkedin = () => {
    const urlMatch = findUrl(LINKEDIN_RE);
    if (urlMatch) return urlMatch;
    if (/(?:^|\s)linkedin(?:\s|$)/i.test(block + "\n" + fullText.slice(0, 500))) {
      _trace.linkedinBareWordFallback = true;
      return "linkedin.com";
    }
    return null;
  };

  return {
    name: extractName(lines),
    email: extractPattern(block, EMAIL_RE),
    phone: extractPattern(block, PHONE_RE),
    linkedin: findLinkedin(),
    github: findUrl(GITHUB_RE),
    location: extractLocation(lines),
  };
}

function extractName(lines: string[]): string | null {
  // Heuristic: first non-empty line that contains no @ and is not a URL
  const candidate = lines.find(
    (l) => !EMAIL_RE.test(l) && !URL_RE.test(l) && !PHONE_RE.test(l)
  );
  return candidate ?? null;
}

function extractLocation(lines: string[]): string | null {
  // Matches "City, ST" or "City, State" patterns
  const match = lines.find((l) => LOCATION_RE.test(l));
  return match ?? null;
}

function extractPattern(text: string, re: RegExp): string | null {
  const match = text.match(re);
  return match ? match[0].trim() : null;
}

// ---------------------------------------------------------------------------
// Experience parser
// ---------------------------------------------------------------------------

function parseExperience(block: string): ExperienceEntry[] {
  if (!block.trim()) return [];

  const rawEntries = splitOnEntryBoundaries(block);
  const result: ExperienceEntry[] = [];

  for (const raw of rawEntries) {
    const entry = parseExperienceEntry(raw);

    // A block is content (not a role header) when it has no dates, no company,
    // and either has no title or its "title" is a long sentence (> 80 chars)
    // or the raw block contains no bullet-prefix chars at all AND the first
    // line reads like prose (ends with punctuation or is very long).
    const firstLine = raw.split("\n")[0]?.trim() ?? "";
    const isProseLike =
      firstLine.length > 60 ||
      /[.!?]$/.test(firstLine) ||
      /^(the|a |an |this |that |our |we |i |my )/i.test(firstLine);
    const isContentBlock =
      !entry.start_date &&
      !entry.end_date &&
      !entry.company &&
      (entry.title === null || entry.title.length > 80 || isProseLike);

    if (isContentBlock && result.length > 0) {
      // Absorb only lines that are real bullets; discard bare prose.
      const bulletLines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => BULLET_RE.test(l))
        .map(stripBullet);
      if (bulletLines.length > 0) {
        result[result.length - 1].bullets.push(...bulletLines);
      }
    } else if (isNonEmptyEntry(entry)) {
      result.push(entry);
    }
  }

  return result;
}

function parseExperienceEntry(raw: string): ExperienceEntry {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const markedBullets = lines.filter((l) => BULLET_RE.test(l)).map(stripBullet);
  const nonBullets = lines.filter((l) => !BULLET_RE.test(l));

  // Parse the first non-bullet line for title / company / location
  const header = parseTitleLine(nonBullets[0] ?? null);
  let { title, company, location } = header;

  // Many resumes put the company on its own line below the job title.
  // If parseTitleLine found no separator on line 1, check line 2.
  if (!company && nonBullets.length >= 2) {
    const line2 = nonBullets[1].trim();
    const isDateLine = DATE_RANGE_RE.test(line2);
    const isLocationOnly = isLocationToken(line2);
    if (!isDateLine && !isLocationOnly && line2.length > 0 && line2.length < 80) {
      company = line2.replace(DATE_RANGE_RE, "").trim() || null;
      if (company) _trace.experienceHeaderFallback = true;
    }
  }

  // Search ALL non-bullet lines for dates.
  const headerText = nonBullets.join(" ");
  const { startDate, endDate, isCurrent } = parseDateRange(headerText);

  // --- Bullet extraction with paragraph fallback ---
  let bullets = markedBullets;

  if (bullets.length === 0) {
    // No bullet markers found — try paragraph-to-bullet extraction on
    // non-bullet lines that are NOT part of the header (title, company, date, location).
    const headerLineCount = countHeaderLines(nonBullets, title, company);
    const bodyLines = nonBullets.slice(headerLineCount);
    if (bodyLines.length > 0) {
      const bodyText = bodyLines.join(" ");
      bullets = splitParagraphIntoBullets(bodyText);
      if (bullets.length > 0) _trace.paragraphToBulletFallback = true;
    }
  }

  return {
    company,
    title,
    start_date: startDate,
    end_date: endDate,
    is_current: isCurrent,
    location: location ?? extractPattern(headerText, LOCATION_RE),
    bullets,
    raw_text: raw.trim(),
  };
}

/**
 * Count how many of the leading nonBullet lines are header content
 * (title, company, date, location) so the rest can be treated as body paragraphs.
 */
function countHeaderLines(
  nonBullets: string[],
  title: string | null,
  company: string | null
): number {
  let count = 0;
  for (const line of nonBullets) {
    // A header line is one that is: the title line, company line, a date line,
    // a location token, or very short metadata (< 40 chars and no sentence punctuation).
    const isDate = DATE_RANGE_RE.test(line);
    const isLoc = isLocationToken(line);
    const isShortMeta = line.length < 40 && !/[.!?]$/.test(line);
    const isTitle = title !== null && line.includes(title);
    const isCompany = company !== null && line.includes(company);

    if (isDate || isLoc || isShortMeta || isTitle || isCompany) {
      count++;
    } else {
      break; // first non-header line → body starts here
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// Paragraph-to-bullet extraction
// ---------------------------------------------------------------------------

/**
 * Common abbreviations that end with a period but are NOT sentence boundaries.
 * Checked before splitting on ". " so "e.g. foo" doesn't become two fragments.
 */
const ABBREV_RE =
  /(?:e\.g|i\.e|vs|etc|Dr|Mr|Mrs|Ms|Jr|Sr|Inc|Corp|Ltd|Co|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|U\.S|U\.K)$/i;

/**
 * Split a paragraph of experience content into individual bullet-like sentences.
 *
 * Strategy:
 *   1. Split on ". " (period + space) as the primary sentence boundary.
 *   2. Protect abbreviations from false splits.
 *   3. Also split on explicit semicolons as secondary boundaries.
 *   4. Filter out fragments shorter than 20 chars (dates, locations, noise).
 *   5. Ensure each bullet ends without a trailing period (matches bullet style).
 */
function splitParagraphIntoBullets(text: string): string[] {
  if (!text.trim()) return [];

  // Replace abbreviation periods with a placeholder to protect them
  const PLACEHOLDER = "\x00";
  let protected_ = text;
  protected_ = protected_.replace(
    /\b(e\.g|i\.e|vs|etc|Dr|Mr|Mrs|Ms|Jr|Sr|Inc|Corp|Ltd|Co|U\.S|U\.K)\./gi,
    (_, abbr) => abbr + PLACEHOLDER
  );

  // Split on sentence boundaries: ". " or "." at end, or "; "
  const fragments = protected_
    .split(/\.\s+|;\s+/)
    .map((s) => s.replace(new RegExp(PLACEHOLDER.replace(/\0/, "\\0"), "g"), "."))
    .map((s) => s.replace(/\.$/, "").trim())
    .filter(Boolean);

  // Filter out fragments too short to be meaningful content
  const MIN_BULLET_LENGTH = 20;
  return fragments.filter(
    (f) =>
      f.length >= MIN_BULLET_LENGTH &&
      // Exclude pure date lines or location tokens that slipped through
      !DATE_RANGE_RE.test(f) &&
      !isLocationToken(f)
  );
}

// ---------------------------------------------------------------------------
// Title / Company / Location extraction
// ---------------------------------------------------------------------------

interface ParsedHeader {
  title: string | null;
  company: string | null;
  location: string | null;
}

/**
 * Parse a single header line into title, company, and location.
 *
 * Priority order:
 *   1. Strip embedded date ranges (PDF merge artefacts)
 *   2. Extract trailing location ("City, ST" or "Remote")
 *   3. Try strong separators: — – | @
 *   4. Try spaced hyphen: " - "
 *   5. Try " at "
 *   6. Try comma (with or without leading space): "Title, Company"
 *   7. Fallback: entire line is the title
 */
function parseTitleLine(line: string | null): ParsedHeader {
  if (!line) return { title: null, company: null, location: null };

  // Strip any date range merged into the line by PDF layout
  let clean = line.replace(DATE_RANGE_RE, "").trim();
  if (!clean) return { title: null, company: null, location: null };

  // --- Extract trailing location ---
  // Matches "..., San Francisco, CA" or "... | New York, NY" at end-of-line.
  // Lazy (.+?) ensures the location captures the full "City, ST" pattern.
  let location: string | null = null;

  const locMatch = clean.match(
    /(.+?)\s*[,|]\s*([A-Z][a-zA-Z\s]+,\s+[A-Z]{2})\s*$/
  );
  if (locMatch) {
    location = locMatch[2].trim();
    clean = locMatch[1].trim();
  } else {
    // Handle "... | Remote" or ", Remote"
    const remoteMatch = clean.match(/(.+?)\s*[,|]\s*(Remote)\s*$/i);
    if (remoteMatch) {
      location = remoteMatch[2].trim();
      clean = remoteMatch[1].trim();
    }
  }

  // --- 1. Strong separators: — – | @ (unambiguous) ---
  const strongParts = clean.split(/\s*[—–|@]\s*/);
  if (strongParts.length >= 2 && strongParts[0] && strongParts[1]) {
    return {
      title: strongParts[0].trim(),
      company: strongParts.slice(1).join(" ").trim(),
      location,
    };
  }

  // --- 2. Spaced hyphen: " - " ---
  const hyphenParts = clean.split(/\s+-\s+/);
  if (hyphenParts.length >= 2 && hyphenParts[0] && hyphenParts[1]) {
    return {
      title: hyphenParts[0].trim(),
      company: hyphenParts.slice(1).join(" - ").trim(),
      location,
    };
  }

  // --- 3. " at " (case insensitive) ---
  const atParts = clean.split(/\s+at\s+/i);
  if (atParts.length >= 2 && atParts[0] && atParts[1]) {
    return {
      title: atParts[0].trim(),
      company: atParts.slice(1).join(" at ").trim(),
      location,
    };
  }

  // --- 4. Comma (with or without leading space) ---
  const commaIdx = clean.indexOf(",");
  if (commaIdx > 0 && commaIdx < clean.length - 1) {
    const before = clean.slice(0, commaIdx).trim();
    const after = clean.slice(commaIdx + 1).trim();

    // If the part after comma is a bare 2-letter state code → location, not company
    if (/^[A-Z]{2}$/.test(after)) {
      return { title: before, company: null, location: location ?? after };
    }
    // If it matches "City, ST" → it's a location embedded without separator
    if (LOCATION_RE.test(after)) {
      return { title: before, company: null, location: location ?? after };
    }
    // Otherwise it's the company
    return { title: before, company: after, location };
  }

  // --- 5. Fallback: whole line is the title ---
  return { title: clean || null, company: null, location };
}

/** True if the string is only a location token (City, ST) or "Remote". */
function isLocationToken(s: string): boolean {
  const trimmed = s.trim();
  if (/^remote$/i.test(trimmed)) return true;
  return LOCATION_RE.test(trimmed) && trimmed.length < 35;
}

function parseDateRange(text: string): {
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
} {
  const match = text.match(DATE_RANGE_RE);
  if (!match) return { startDate: null, endDate: null, isCurrent: false };

  const endRaw = match[2]?.trim() ?? "";
  const isCurrent = /present|current|now/i.test(endRaw);

  return {
    startDate: match[1]?.trim() ?? null,
    endDate: isCurrent ? null : endRaw || null,
    isCurrent,
  };
}

// A line that looks like a job/education title: starts with a capital letter,
// is not a pure bullet, not a pure date, and not a known location-only line.
const TITLE_LINE_RE = /^[A-Z][A-Za-z].*(?:[A-Za-z]{3,})/;

/**
 * Returns true when a line looks like a new role header.
 * A role header has either:
 *   - an inline separator (—, –, |, comma, " at ") suggesting title/company, or
 *   - it is followed by a date line (next non-empty line is a date range)
 *
 * This is stronger than just TITLE_LINE_RE because it avoids matching
 * standalone location lines ("New York, NY") or prose continuations.
 */
function isRoleHeader(trimmed: string, nextNonEmpty: string | null): boolean {
  // Hard rejects — these are never role headers regardless of separators
  if (BULLET_RE.test(trimmed)) return false;
  if (DATE_RANGE_RE.test(trimmed) && trimmed.replace(DATE_RANGE_RE, "").trim().length === 0) return false;
  if (isLocationToken(trimmed)) return false;
  if (/[.!?]$/.test(trimmed)) return false;   // prose
  if (trimmed.length > 80) return false;        // too long to be a title

  // Strong signal: line contains an inline title/company separator.
  // This fires even for short titles like "Dev — B" where TITLE_LINE_RE
  // would fail due to the 3+ letter word requirement.
  const hasStrongSeparator =
    /\s*[—–|@]\s*/.test(trimmed) ||
    /\s+at\s+/i.test(trimmed) ||
    (/,\s*\S/.test(trimmed) && !LOCATION_RE.test(trimmed));
  if (hasStrongSeparator) return true;

  // For lines without a separator, require basic title shape
  if (!TITLE_LINE_RE.test(trimmed)) return false;

  // Moderate signal: next line is a date range or a short company-looking
  // line (< 40 chars, no punctuation — distinguishes "Netflix" from
  // "with Node.js and Express. Managed databases")
  if (nextNonEmpty) {
    if (DATE_RANGE_RE.test(nextNonEmpty)) return true;
    const isCompanyLike =
      nextNonEmpty.length < 40 &&
      !BULLET_RE.test(nextNonEmpty) &&
      !isLocationToken(nextNonEmpty) &&
      !/[.!?]/.test(nextNonEmpty);
    if (isCompanyLike) return true;
  }

  return false;
}

function splitOnEntryBoundaries(block: string): string[] {
  // Prefer double-newline splits (well-formatted resumes).
  const byBlankLine = block.split(/\n{2,}/).filter((s) => s.trim());
  if (byBlankLine.length > 1) return byBlankLine;

  // Fall back: single-newline PDFs — detect a new entry when a role-header
  // line appears after content (bullets or body text) has been seen.
  const lines = block.split("\n");
  const entries: string[] = [];
  let current: string[] = [];
  let seenContent = false; // true after seeing a bullet or body text line

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) {
      current.push(lines[i]);
      continue;
    }

    const isBullet = BULLET_RE.test(trimmed);
    const isDateOnly = DATE_RANGE_RE.test(trimmed) && trimmed.replace(DATE_RANGE_RE, "").trim().length === 0;

    // Find the next non-empty line for look-ahead
    let nextNonEmpty: string | null = null;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim()) { nextNonEmpty = lines[j].trim(); break; }
    }

    const isNewRole = isRoleHeader(trimmed, nextNonEmpty);

    if (seenContent && isNewRole && current.length > 0) {
      _trace.experienceSplitLog.push({
        line: trimmed.slice(0, 80),
        action: "split",
        reason: "new role header detected after content",
      });
      entries.push(current.join("\n"));
      current = [lines[i]];
      seenContent = false;
    } else {
      // Mark content seen: bullets, date-only lines, location lines, or
      // body text that isn't a title candidate
      if (isBullet || isDateOnly || isLocationToken(trimmed) ||
          (current.length > 0 && !isNewRole && trimmed.length > 20)) {
        seenContent = true;
      }
      current.push(lines[i]);
    }
  }

  if (current.length > 0) entries.push(current.join("\n"));
  return entries.filter((s) => s.trim());
}

function isNonEmptyEntry(entry: ExperienceEntry): boolean {
  return Boolean(entry.title || entry.company || entry.bullets.length > 0);
}

// ---------------------------------------------------------------------------
// Education parser
// ---------------------------------------------------------------------------

function parseEducation(block: string): EducationEntry[] {
  if (!block.trim()) return [];

  const rawEntries = splitOnEntryBoundaries(block);

  // If splitting produced only one block but the text contains multiple
  // institution/degree-looking lines, the grouping fallback was needed.
  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
  if (rawEntries.length === 1 && lines.length >= 4) {
    _trace.educationGroupingFallback = true;
  }

  return rawEntries
    .map(parseEducationEntry)
    .filter((e) => e.institution || e.degree);
}

function parseEducationEntry(raw: string): EducationEntry {
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const { startDate, endDate } = parseDateRange(lines.join(" "));

  const gpaMatch = raw.match(/GPA[:\s]+([0-9.]+)/i);

  return {
    institution: lines[0] ?? null,
    degree: lines[1] ?? null,
    field_of_study: extractFieldOfStudy(lines[1] ?? ""),
    start_date: startDate,
    end_date: endDate,
    gpa: gpaMatch ? gpaMatch[1] : null,
    raw_text: raw.trim(),
  };
}

function extractFieldOfStudy(degreeLine: string): string | null {
  // Matches "B.S. Computer Science" → "Computer Science"
  const match = degreeLine.match(
    /(?:B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?B\.?A\.?|Ph\.?D\.?)\s+(?:in\s+)?(.+)/i
  );
  return match ? match[1].trim() : null;
}

// ---------------------------------------------------------------------------
// Skills parser
// ---------------------------------------------------------------------------

function parseSkills(block: string): SkillsSection {
  if (!block.trim()) return { raw_list: [], categories: {} };

  const categories: Record<string, string[]> = {};
  const rawList: string[] = [];

  const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Format: "Category: skill1, skill2, skill3"
    const categoryMatch = line.match(/^([^:]{2,40}):\s+(.+)$/);
    if (categoryMatch) {
      const cat = categoryMatch[1].trim();
      const items = categoryMatch[2].split(/[,|]/).map((s) => s.trim()).filter(Boolean);
      categories[cat] = items;
      rawList.push(...items);
    } else {
      // Flat list
      const items = line.split(/[,|•·]/).map((s) => s.trim()).filter(Boolean);
      rawList.push(...items);
    }
  }

  return { raw_list: [...new Set(rawList)], categories };
}

// ---------------------------------------------------------------------------
// Certifications + Projects parsers
// ---------------------------------------------------------------------------

function parseCertifications(block: string): string[] {
  return parseSimpleList(block);
}

function parseProjects(block: string): string[] {
  return parseSimpleList(block);
}

function parseSimpleList(block: string): string[] {
  return block
    .split("\n")
    .map((l) => stripBullet(l.trim()))
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Parse confidence heuristic
// ---------------------------------------------------------------------------

/**
 * Multi-signal confidence scoring.  Assigns a granular score (0–100) internally,
 * then buckets into high / medium / low for the public API.
 *
 * Signals (each contributes up to the shown weight):
 *   +30  experience section detected AND has ≥ 1 entry
 *   +20  education section detected AND has ≥ 1 entry
 *   +10  skills section detected AND has ≥ 1 skill
 *   +15  contact has name + email + phone
 *   +10  ≥ 1 experience entry has dates
 *   +10  no parse warnings
 *    +5  ≥ 300 words
 */
function deriveParseConfidence(
  sections: string[],
  warnings: string[],
  parsed?: {
    contact: ContactInfo;
    experience: ExperienceEntry[];
    education: EducationEntry[];
    skills: SkillsSection;
  }
): "high" | "medium" | "low" {
  let score = 0;

  // Section detection
  if (sections.includes("experience") && (parsed?.experience?.length ?? 0) > 0) score += 30;
  if (sections.includes("education") && (parsed?.education?.length ?? 0) > 0) score += 20;
  if (sections.includes("skills") && (parsed?.skills?.raw_list?.length ?? 0) > 0) score += 10;

  // Contact completeness
  if (parsed?.contact) {
    if (parsed.contact.name) score += 5;
    if (parsed.contact.email) score += 5;
    if (parsed.contact.phone) score += 5;
  }

  // Date presence in at least one experience entry
  if (parsed?.experience?.some((e) => e.start_date || e.end_date || e.is_current)) {
    score += 10;
  }

  // Warning-free parse
  if (warnings.length === 0) score += 10;

  // Sufficient content (not used when `parsed` isn't available)
  if (parsed && (parsed.experience.flatMap((e) => e.bullets).length >= 4)) score += 5;

  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/**
 * Per-section confidence based on what was detected vs. extracted.
 *
 * high   = header detected AND entries/fields extracted successfully
 * medium = header detected BUT extraction was partial or used a fallback
 * low    = header not detected OR extraction failed entirely
 */
function deriveSectionConfidence(
  detected: string[],
  parsed: {
    contact: ContactInfo;
    experience: ExperienceEntry[];
    education: EducationEntry[];
    skills: SkillsSection;
  }
): { contact: "high" | "medium" | "low"; experience: "high" | "medium" | "low"; education: "high" | "medium" | "low"; skills: "high" | "medium" | "low" } {
  // Contact: high if name+email, medium if partial, low if nothing
  const c = parsed.contact;
  const contactFields = [c.name, c.email, c.phone].filter(Boolean).length;
  const contactConf = contactFields >= 2 ? "high" : contactFields >= 1 ? "medium" : "low";

  // Experience
  const expDetected = detected.includes("experience");
  const expEntries = parsed.experience.length;
  const expHasDates = parsed.experience.some((e) => e.start_date || e.end_date || e.is_current);
  const expHasBullets = parsed.experience.some((e) => e.bullets.length > 0);
  let expConf: "high" | "medium" | "low" = "low";
  if (expDetected && expEntries > 0 && expHasDates && expHasBullets) expConf = "high";
  else if (expDetected && expEntries > 0) expConf = "medium";
  else if (expDetected) expConf = "low";

  // Education
  const eduDetected = detected.includes("education");
  const eduEntries = parsed.education.length;
  const eduHasInst = parsed.education.some((e) => e.institution?.trim());
  let eduConf: "high" | "medium" | "low" = "low";
  if (eduDetected && eduEntries > 0 && eduHasInst) eduConf = "high";
  else if (eduDetected && eduEntries > 0) eduConf = "medium";
  else if (eduDetected) eduConf = "low";

  // Skills
  const skillsDetected = detected.includes("skills");
  const skillCount = parsed.skills.raw_list.length;
  let skillsConf: "high" | "medium" | "low" = "low";
  if (skillsDetected && skillCount >= 5) skillsConf = "high";
  else if (skillsDetected && skillCount > 0) skillsConf = "medium";
  else if (skillsDetected) skillsConf = "low";

  return {
    contact: contactConf,
    experience: expConf,
    education: eduConf,
    skills: skillsConf,
  };
}

// ---------------------------------------------------------------------------
// Regex constants
// ---------------------------------------------------------------------------

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_%-]+\/?/i;
const GITHUB_RE = /github\.com\/[a-zA-Z0-9\-_%]+/i;
const URL_RE = /https?:\/\/|www\.|linkedin\.com|github\.com/i;
const LOCATION_RE = /[A-Z][a-zA-Z\s]+,\s+[A-Z]{2}/;
const BULLET_RE = /^[•·\-*>]\s+/;

/**
 * A single date token.  Ordered most-specific → least-specific so the regex
 * engine picks the longest match at each position:
 *   1. "Jan 2024"  – month abbreviation + 4-digit year
 *   2. "12/2024"   – MM/YYYY
 *   3. "12/24"     – MM/YY  (2-digit year, not followed by a third digit)
 *   4. "2024"      – bare 4-digit year
 *   5. "Jan"       – month name only (for "Jan – Mar" ranges without a year)
 */
const MONTH_ABBR =
  "(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?";
const DATE_TOKEN = [
  `${MONTH_ABBR}\\s+\\d{4}`,       // Jan 2024
  `\\d{1,2}\\/\\d{4}`,              // 12/2024
  `\\d{1,2}\\/\\d{2}(?!\\d)`,       // 12/24  (not 12/240)
  `\\d{4}`,                          // 2024
  MONTH_ABBR,                        // Jan  (month-only)
].join("|");

const DATE_RANGE_RE = new RegExp(
  `(${DATE_TOKEN})\\s*[-–—]+\\s*(${DATE_TOKEN}|[Pp]resent|[Cc]urrent|[Nn]ow)`
);

function stripBullet(line: string): string {
  return line.replace(BULLET_RE, "").trim();
}
