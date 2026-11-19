/**
 * detectSections.ts
 *
 * Segments a raw resume text string into named sections.
 * Pure function: takes text, returns a section map + detected section names.
 *
 * Strategy:
 *   1. Build a ranked list of section header candidates via regex.
 *   2. Split the text at each header boundary.
 *   3. Assign canonical section names to each block.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SectionKey =
  | "contact"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "certifications"
  | "projects"
  | "unknown";

export type SectionMap = Partial<Record<SectionKey, string>>;

export interface DetectSectionsResult {
  sections: SectionMap;
  detectedSectionNames: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Section header patterns (order matters — more specific patterns first)
// ---------------------------------------------------------------------------

interface SectionPattern {
  key: SectionKey;
  patterns: RegExp[];
}

const SECTION_PATTERNS: SectionPattern[] = [
  {
    key: "summary",
    patterns: [
      /^(professional\s+)?summary$/i,
      /^objective$/i,
      /^profile$/i,
      /^about\s+me$/i,
      /^career\s+objective$/i,
    ],
  },
  {
    key: "experience",
    patterns: [
      /^(work\s+)?experience$/i,
      /^(professional\s+)?experience$/i,
      /^employment(\s+history)?$/i,
      /^work\s+history$/i,
      /^career\s+history$/i,
    ],
  },
  {
    key: "education",
    patterns: [
      /^education(al\s+background)?$/i,
      /^academic\s+(background|history)$/i,
      /^degrees?$/i,
    ],
  },
  {
    key: "skills",
    patterns: [
      /^(technical\s+)?skills$/i,
      /^core\s+competencies$/i,
      /^competencies$/i,
      /^technologies?$/i,
      /^tools\s+&\s+technologies$/i,
      /^expertise$/i,
    ],
  },
  {
    key: "certifications",
    patterns: [
      /^certifications?$/i,
      /^licenses?\s+&\s+certifications?$/i,
      /^credentials?$/i,
      /^professional\s+development$/i,
    ],
  },
  {
    key: "projects",
    patterns: [
      /^(personal\s+|side\s+)?projects?$/i,
      /^notable\s+projects?$/i,
      /^open[\s-]source$/i,
    ],
  },
];

// ---------------------------------------------------------------------------
// Core detector
// ---------------------------------------------------------------------------

/**
 * Split raw resume text into labeled sections.
 *
 * The contact section is always the text before the first detected header.
 */
export function detectSections(rawText: string): DetectSectionsResult {
  const warnings: string[] = [];
  const lines = rawText.split("\n");

  // Find all header positions
  const headerMatches = findHeaderPositions(lines);

  if (headerMatches.length === 0) {
    warnings.push(
      "No section headers detected. Resume may be unstructured or use non-standard formatting."
    );
    return {
      sections: { contact: rawText },
      detectedSectionNames: [],
      warnings,
    };
  }

  const sections: SectionMap = {};
  const detectedSectionNames: string[] = [];

  // Everything before the first header is the contact block
  const firstHeaderLine = headerMatches[0].lineIndex;
  if (firstHeaderLine > 0) {
    sections.contact = lines.slice(0, firstHeaderLine).join("\n").trim();
  }

  // Slice text between consecutive headers
  for (let i = 0; i < headerMatches.length; i++) {
    const current = headerMatches[i];
    const nextLineIndex =
      i + 1 < headerMatches.length
        ? headerMatches[i + 1].lineIndex
        : lines.length;

    const sectionContent = lines
      .slice(current.lineIndex + 1, nextLineIndex)
      .join("\n")
      .trim();

    if (!sections[current.key]) {
      sections[current.key] = sectionContent;
      detectedSectionNames.push(current.key);
    } else {
      // Merge duplicate sections (e.g., two "Experience" headers)
      sections[current.key] += "\n\n" + sectionContent;
      warnings.push(
        `Duplicate section header detected: "${current.rawHeader}". Content merged.`
      );
    }
  }

  if (!sections.experience) {
    warnings.push("No experience section detected.");
  }
  if (!sections.education) {
    warnings.push("No education section detected.");
  }

  return { sections, detectedSectionNames, warnings };
}

// ---------------------------------------------------------------------------
// Header detection helpers
// ---------------------------------------------------------------------------

interface HeaderMatch {
  lineIndex: number;
  key: SectionKey;
  rawHeader: string;
}

function findHeaderPositions(lines: string[]): HeaderMatch[] {
  const matches: HeaderMatch[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    // Headers are typically short (≤60 chars) and don't end with punctuation
    if (trimmed.length > 60 || /[.,;]$/.test(trimmed)) continue;

    const key = resolveHeaderKey(trimmed);
    if (key) {
      matches.push({ lineIndex: i, key, rawHeader: trimmed });
    }
  }

  return matches;
}

function resolveHeaderKey(line: string): SectionKey | null {
  // Strip common decorators: "── EXPERIENCE ──", "=== Skills ==="
  const cleaned = line.replace(/^[\-=*#>\s]+|[\-=*#<\s]+$/g, "").trim();

  for (const { key, patterns } of SECTION_PATTERNS) {
    if (patterns.some((re) => re.test(cleaned))) {
      return key;
    }
  }
  return null;
}
