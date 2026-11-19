/**
 * Edge-case tests for rule evaluators:
 *   - boundary conditions (thresholds, empty arrays)
 *   - interaction between rules (multiple violations)
 *   - cap rule behaviour
 *   - content quality with unusual bullet patterns
 */
import { describe, it, expect } from "vitest";
import { evaluateParseability } from "../lib/rules/evaluators/evaluateParseability";
import { evaluateStructure } from "../lib/rules/evaluators/evaluateStructure";
import { evaluateContentQuality } from "../lib/rules/evaluators/evaluateContentQuality";
import { buildResume } from "./helpers";
import type { ExperienceEntry } from "../types/resume";

function ruleIds(result: { violations: { ruleId: string }[] }) {
  return result.violations.map((v) => v.ruleId);
}

function makeEntry(overrides: Partial<ExperienceEntry> = {}): ExperienceEntry {
  return {
    company: "TestCo",
    title: "Engineer",
    start_date: "Jan 2020",
    end_date: "Dec 2023",
    is_current: false,
    location: null,
    bullets: [
      "Led migration of monolith to microservices, reducing deploy time by 60%.",
      "Built REST APIs handling 10K requests/sec.",
      "Implemented CI/CD pipeline cutting releases from weekly to daily.",
    ],
    raw_text: "",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Parseability edge cases
// ---------------------------------------------------------------------------

describe("evaluateParseability – edge cases", () => {
  it("fires BOTH PARSE_001 and PARSE_006 on empty resume", () => {
    const result = evaluateParseability(
      buildResume({
        raw_text: "",
        parse_metadata: {
          char_count: 0,
          detected_sections: [],
          parse_warnings: [],
        },
      })
    );
    const ids = ruleIds(result);
    expect(ids).toContain("PARSE_001");
    expect(ids).toContain("PARSE_006");
  });

  it("does NOT fire PARSE_007 at exactly 300 words", () => {
    const text = Array(300).fill("word").join(" ");
    const result = evaluateParseability(buildResume({ raw_text: text }));
    expect(ruleIds(result)).not.toContain("PARSE_007");
  });

  it("fires PARSE_007 at 299 words", () => {
    const text = Array(299).fill("word").join(" ");
    const result = evaluateParseability(buildResume({ raw_text: text }));
    expect(ruleIds(result)).toContain("PARSE_007");
  });

  it("does NOT fire PARSE_001 at exactly 100 characters", () => {
    const text = "a".repeat(100) + " ".repeat(300); // 100 meaningful chars + padding to avoid PARSE_007
    // Add enough words
    const padded = text + " " + Array(300).fill("word").join(" ");
    const result = evaluateParseability(buildResume({ raw_text: padded }));
    expect(ruleIds(result)).not.toContain("PARSE_001");
  });

  it("PARSE_002 fires on low parse confidence", () => {
    const result = evaluateParseability(
      buildResume({ parse_metadata: { parse_confidence: "low" } })
    );
    expect(ruleIds(result)).toContain("PARSE_002");
  });

  it("PARSE_002 does NOT fire on medium confidence", () => {
    const result = evaluateParseability(
      buildResume({ parse_metadata: { parse_confidence: "medium" } })
    );
    expect(ruleIds(result)).not.toContain("PARSE_002");
  });

  it("penalty accumulates across multiple violations", () => {
    const result = evaluateParseability(
      buildResume({
        contact: { name: null, email: null, phone: null, linkedin: null, github: null },
      })
    );
    // Should fire PARSE_003, PARSE_004, PARSE_005, PARSE_008, PARSE_009
    expect(result.violations.length).toBeGreaterThanOrEqual(4);
    expect(result.totalPenalty).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Structure edge cases
// ---------------------------------------------------------------------------

describe("evaluateStructure – edge cases", () => {
  it("STRUCT_007 flags entries with zero bullets", () => {
    const result = evaluateStructure(
      buildResume({ experience: [makeEntry({ bullets: [] })] })
    );
    expect(ruleIds(result)).toContain("STRUCT_007");
  });

  it("STRUCT_008 flags entries with only 1 bullet", () => {
    const result = evaluateStructure(
      buildResume({
        experience: [
          makeEntry({ bullets: ["Single bullet point."] }),
          makeEntry(), // normal entry
        ],
      })
    );
    expect(ruleIds(result)).toContain("STRUCT_008");
  });

  it("STRUCT_008 does NOT fire when all entries have 2+ bullets", () => {
    const result = evaluateStructure(
      buildResume({
        experience: [
          makeEntry({ bullets: ["Bullet one.", "Bullet two."] }),
          makeEntry(),
        ],
      })
    );
    expect(ruleIds(result)).not.toContain("STRUCT_008");
  });

  it("STRUCT_011 flags resume over 2 pages (> 6000 chars)", () => {
    const longText = "a ".repeat(4000); // ~8000 chars
    const result = evaluateStructure(buildResume({ raw_text: longText }));
    expect(ruleIds(result)).toContain("STRUCT_011");
  });

  it("STRUCT_011 does NOT fire for normal-length resume", () => {
    const result = evaluateStructure(buildResume());
    expect(ruleIds(result)).not.toContain("STRUCT_011");
  });

  it("does NOT fire STRUCT_013 when ≥ 2 entries exist", () => {
    const result = evaluateStructure(buildResume()); // default has 2 entries
    expect(ruleIds(result)).not.toContain("STRUCT_013");
  });

  it("cap rule activates for STRUCT_001 when truly missing (no header detected)", () => {
    const result = evaluateStructure(
      buildResume({
        experience: [],
        parse_metadata: { detected_sections: ["education", "skills"] },
      })
    );
    expect(result.cap).not.toBeNull();
    expect(result.cap).toBeLessThanOrEqual(40);
  });

  it("cap rule does NOT activate for STRUCT_001 when header detected but empty", () => {
    const result = evaluateStructure(
      buildResume({
        experience: [],
        parse_metadata: { detected_sections: ["experience", "education", "skills"] },
      })
    );
    // Soft penalty fires but cap is not applied
    expect(result.cap).toBeNull();
  });

  it("accumulates violations from multiple incomplete entries", () => {
    const result = evaluateStructure(
      buildResume({
        experience: [
          makeEntry({ title: null, company: null, start_date: null, end_date: null, bullets: [] }),
          makeEntry({ title: null }),
        ],
      })
    );
    // Should flag titles, bullets, possibly company
    expect(result.violations.length).toBeGreaterThanOrEqual(2);
  });

  it("handles experience with is_current=true as having dates", () => {
    const result = evaluateStructure(
      buildResume({
        experience: [
          makeEntry({ start_date: null, end_date: null, is_current: true }),
        ],
      })
    );
    expect(ruleIds(result)).not.toContain("STRUCT_006");
  });
});

// ---------------------------------------------------------------------------
// Content quality edge cases
// ---------------------------------------------------------------------------

describe("evaluateContentQuality – edge cases", () => {
  it("ratio-based rules fire with relaxed thresholds for 1–2 bullets", () => {
    // 2 good bullets with action verbs + metrics → should pass relaxed thresholds
    const resume = buildResume();
    resume.experience = [makeEntry({ bullets: ["Built APIs handling 10K requests.", "Reduced latency by 40%."] })];
    const result = evaluateContentQuality(resume);
    const ids = ruleIds(result);
    // These should NOT fire because the 2 bullets are well-written
    expect(ids).not.toContain("CONTENT_002"); // no weak verbs
    expect(ids).not.toContain("CONTENT_004"); // not too long
    expect(ids).not.toContain("CONTENT_009"); // no responsibility phrases
  });

  it("low-bullet CONTENT_001 fires when 1–2 bullets have zero quantification", () => {
    const resume = buildResume();
    resume.experience = [makeEntry({ bullets: ["Worked on frontend tasks.", "Attended meetings."] })];
    const result = evaluateContentQuality(resume);
    expect(ruleIds(result)).toContain("CONTENT_001"); // 0% quantified
  });

  it("low-bullet CONTENT_002 fires when both bullets use weak verbs", () => {
    const resume = buildResume();
    resume.experience = [makeEntry({ bullets: ["Helped with frontend.", "Assisted the backend team."] })];
    const result = evaluateContentQuality(resume);
    // 100% weak verbs > 50% relaxed threshold → fires
    expect(ruleIds(result)).toContain("CONTENT_002");
  });

  it("CONTENT_004 flags bullets > 200 chars", () => {
    const longBullet = "Led " + "a".repeat(210) + " project.";
    const resume = buildResume();
    resume.experience = [
      makeEntry({
        bullets: [
          longBullet,
          longBullet,
          longBullet,
          "Built REST APIs handling 10K requests/sec.",
        ],
      }),
    ];
    const result = evaluateContentQuality(resume);
    expect(ruleIds(result)).toContain("CONTENT_004");
  });

  it("CONTENT_005 flags bullets < 40 chars", () => {
    const resume = buildResume();
    resume.experience = [
      makeEntry({
        bullets: ["Did X.", "Did Y.", "Did Z.", "Also did W."],
      }),
    ];
    const result = evaluateContentQuality(resume);
    expect(ruleIds(result)).toContain("CONTENT_005");
  });

  it("CONTENT_009 flags responsibility-heavy language", () => {
    const resume = buildResume();
    resume.experience = [
      makeEntry({
        bullets: [
          "Responsible for managing the deployment pipeline and infrastructure.",
          "Duties included monitoring and alerting for production services.",
          "In charge of onboarding new team members to the codebase.",
          "Led migration to Kubernetes, reducing costs by 30%.",
        ],
      }),
    ];
    const result = evaluateContentQuality(resume);
    expect(ruleIds(result)).toContain("CONTENT_009");
  });

  it("CONTENT_011 flags skills section with no technical skills", () => {
    // Use words that avoid ALL TECHNICAL_SKILL_SIGNALS substrings (including "r", "go", "git")
    const resume = buildResume({
      skills: {
        raw_list: ["Speaking", "Planning", "Listening", "Typing", "Filing"],
        categories: {},
      },
    });
    const result = evaluateContentQuality(resume);
    expect(ruleIds(result)).toContain("CONTENT_011");
  });

  it("CONTENT_011 does NOT fire when technical skills present", () => {
    const result = evaluateContentQuality(buildResume()); // default has React, Python etc.
    expect(ruleIds(result)).not.toContain("CONTENT_011");
  });

  it("CONTENT_012 flags employment gap > 6 months", () => {
    const resume = buildResume({
      experience: [
        makeEntry({ start_date: "Jan 2023", end_date: "Dec 2024" }),
        makeEntry({ start_date: "Jan 2020", end_date: "Jan 2022" }), // 12 month gap
      ],
    });
    const result = evaluateContentQuality(resume);
    expect(ruleIds(result)).toContain("CONTENT_012");
  });

  it("CONTENT_012 does NOT fire for continuous employment", () => {
    const result = evaluateContentQuality(buildResume()); // default has continuous dates
    expect(ruleIds(result)).not.toContain("CONTENT_012");
  });

  it("handles resume with zero experience entries gracefully", () => {
    const resume = buildResume({ experience: [] });
    const result = evaluateContentQuality(resume);
    // CONTENT_006 fires (too few bullets) but CONTENT_003 does NOT —
    // zero experience entries is a structure issue, not a content issue.
    expect(ruleIds(result)).toContain("CONTENT_006");
    expect(ruleIds(result)).not.toContain("CONTENT_003");
  });

  it("zero-bullet penalty floor: fires CONTENT_003 + CONTENT_001 when experience text exists but no bullets", () => {
    const resume = buildResume({
      experience: [
        makeEntry({
          bullets: [],
          raw_text: "Developed REST APIs serving mobile and web clients with Node.js and Express. Managed databases.",
        }),
        makeEntry({
          bullets: [],
          raw_text: "Built internal tools for the operations team using Python and Django.",
        }),
      ],
    });
    const result = evaluateContentQuality(resume);
    const ids = ruleIds(result);
    expect(ids).toContain("CONTENT_006");
    expect(ids).toContain("CONTENT_003");
    expect(ids).toContain("CONTENT_001");
    expect(result.totalPenalty).toBeGreaterThanOrEqual(55);
  });

  it("zero-bullet floor does NOT fire when entries have no raw text (structural issue)", () => {
    const resume = buildResume({
      experience: [
        makeEntry({ bullets: [], raw_text: "" }),
      ],
    });
    const result = evaluateContentQuality(resume);
    // No raw text → not a content extraction risk, just an empty entry
    expect(ruleIds(result)).not.toContain("CONTENT_003");
  });

  it("zero-bullet floor does NOT fire when experience array is empty", () => {
    const resume = buildResume({ experience: [] });
    const result = evaluateContentQuality(resume);
    expect(ruleIds(result)).not.toContain("CONTENT_003");
    expect(ruleIds(result)).not.toContain("CONTENT_001");
  });

  it("zero-bullet floor does NOT fire when bullets exist", () => {
    const resume = buildResume(); // default has good bullets
    const result = evaluateContentQuality(resume);
    expect(ruleIds(result)).not.toContain("CONTENT_003");
  });
});
