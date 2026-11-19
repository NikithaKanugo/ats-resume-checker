/**
 * Structure evaluator: false-positive prevention tests.
 *
 * Verifies that section-missing rules do NOT fire when the section
 * exists but was partially parsed, and that entry-level rules respect
 * parse confidence gating.
 */
import { describe, it, expect } from "vitest";
import { evaluateStructure } from "../lib/rules/evaluators/evaluateStructure";
import { buildResume } from "./helpers";
import type { ExperienceEntry, EducationEntry } from "../types/resume";

function ids(r: ReturnType<typeof evaluateStructure>) {
  return r.violations.map((v) => v.ruleId);
}
function pen(r: ReturnType<typeof evaluateStructure>, id: string) {
  return r.violations.find((v) => v.ruleId === id)?.penalty ?? null;
}

function entry(o: Partial<ExperienceEntry> = {}): ExperienceEntry {
  return {
    company: "TestCo", title: "Engineer",
    start_date: "Jan 2020", end_date: "Dec 2023",
    is_current: false, location: null,
    bullets: ["Led migration reducing deploy time by 60%.", "Built APIs.", "Wrote tests."],
    raw_text: "Engineer at TestCo...",
    ...o,
  };
}

function eduEntry(o: Partial<EducationEntry> = {}): EducationEntry {
  return {
    institution: "MIT", degree: "B.S. CS", field_of_study: "CS",
    start_date: "2016", end_date: "2020", gpa: null, raw_text: "MIT B.S. CS",
    ...o,
  };
}

// ---------------------------------------------------------------------------
// Section detection vs extraction mismatch
// ---------------------------------------------------------------------------

describe("structure — no false missing-section errors", () => {

  it("does NOT flag experience missing when entries are present", () => {
    const r = evaluateStructure(buildResume({ experience: [entry()] }));
    expect(ids(r)).not.toContain("STRUCT_001");
  });

  it("does NOT flag education missing when entries are present", () => {
    const r = evaluateStructure(buildResume({ education: [eduEntry()] }));
    expect(ids(r)).not.toContain("STRUCT_002");
  });

  it("does NOT flag skills missing when skills are present", () => {
    const r = evaluateStructure(buildResume({
      skills: { raw_list: ["Python", "Go"], categories: {} },
    }));
    expect(ids(r)).not.toContain("STRUCT_003");
  });

  it("soft penalty for experience when header detected but zero entries extracted", () => {
    const r = evaluateStructure(buildResume({
      experience: [],
      parse_metadata: { detected_sections: ["experience", "education", "skills"] },
    }));
    expect(ids(r)).toContain("STRUCT_001");
    expect(pen(r, "STRUCT_001")).toBe(20); // half of 40
    expect(r.cap).toBeNull();
  });

  it("soft penalty for education when header detected but zero entries extracted", () => {
    const r = evaluateStructure(buildResume({
      education: [],
      parse_metadata: { detected_sections: ["experience", "education", "skills"] },
    }));
    expect(ids(r)).toContain("STRUCT_002");
    expect(pen(r, "STRUCT_002")).toBe(10); // half of 20
    expect(r.cap).toBeNull();
  });

  it("soft penalty for skills when header detected but zero skills extracted", () => {
    const r = evaluateStructure(buildResume({
      skills: { raw_list: [], categories: {} },
      parse_metadata: { detected_sections: ["experience", "education", "skills"] },
    }));
    expect(ids(r)).toContain("STRUCT_003");
    expect(pen(r, "STRUCT_003")).toBe(10); // half of 20
  });

  it("full penalty + cap ONLY when header is truly absent", () => {
    const r = evaluateStructure(buildResume({
      experience: [],
      parse_metadata: { detected_sections: ["education", "skills"] },
    }));
    expect(pen(r, "STRUCT_001")).toBe(40);
    expect(r.cap).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// Confidence gating on entry-level rules
// ---------------------------------------------------------------------------

describe("structure — confidence gating", () => {

  it("suppresses ALL entry-level rules at low confidence", () => {
    const r = evaluateStructure(buildResume({
      parse_metadata: { parse_confidence: "low" },
      experience: [entry({ title: null, company: null, start_date: null, end_date: null, bullets: [] })],
      education: [eduEntry({ institution: null, degree: null })],
    }));
    const fired = ids(r);
    for (const rule of ["STRUCT_004","STRUCT_005","STRUCT_006","STRUCT_007","STRUCT_008","STRUCT_009","STRUCT_010"]) {
      expect(fired).not.toContain(rule);
    }
  });

  it("fires entry-level rules at medium confidence", () => {
    const r = evaluateStructure(buildResume({
      parse_metadata: { parse_confidence: "medium" },
      experience: [entry({ title: null })],
    }));
    expect(ids(r)).toContain("STRUCT_004");
  });

  it("fires entry-level rules at high confidence", () => {
    const r = evaluateStructure(buildResume({
      parse_metadata: { parse_confidence: "high" },
      experience: [entry({ title: null })],
    }));
    expect(ids(r)).toContain("STRUCT_004");
  });

  it("document shape rules (011, 012, 013) fire regardless of confidence", () => {
    const r = evaluateStructure(buildResume({
      parse_metadata: { parse_confidence: "low" },
      summary: null,
      experience: [entry()],
    }));
    expect(ids(r)).toContain("STRUCT_012"); // missing summary
    expect(ids(r)).toContain("STRUCT_013"); // single entry
  });
});

// ---------------------------------------------------------------------------
// Entry-level completeness — correct per-entry scoping
// ---------------------------------------------------------------------------

describe("structure — per-entry targeting", () => {

  it("STRUCT_004 targets the entry index that is missing a title", () => {
    const r = evaluateStructure(buildResume({
      experience: [
        entry(),                    // index 0: complete
        entry({ title: null }),     // index 1: missing title
      ],
    }));
    const v = r.violations.find((v) => v.ruleId === "STRUCT_004");
    expect(v?.target_section).toBe("experience.1");
  });

  it("STRUCT_006 only flags entries with BOTH title and company", () => {
    const r = evaluateStructure(buildResume({
      experience: [
        entry({ company: null, start_date: null, end_date: null }),  // no company → skip
        entry({ start_date: null, end_date: null }),                 // has both → flag
      ],
    }));
    const v = r.violations.find((v) => v.ruleId === "STRUCT_006");
    expect(v?.target_section).toBe("experience.1");
  });

  it("STRUCT_005 only flags when entry has title AND bullets but no company", () => {
    // Entry with title but no bullets → don't flag (might be a fragment)
    const r = evaluateStructure(buildResume({
      experience: [
        entry({ company: null, bullets: [] }),   // no bullets → skip
        entry({ company: null }),                // has bullets → flag
      ],
    }));
    const v = r.violations.find((v) => v.ruleId === "STRUCT_005");
    expect(v?.target_section).toBe("experience.1");
  });

  it("STRUCT_009 targets the education entry missing institution", () => {
    const r = evaluateStructure(buildResume({
      education: [
        eduEntry(),
        eduEntry({ institution: null }),
      ],
    }));
    const v = r.violations.find((v) => v.ruleId === "STRUCT_009");
    expect(v?.target_section).toBe("education.1");
  });

  it("is_current=true counts as having dates", () => {
    const r = evaluateStructure(buildResume({
      experience: [entry({ start_date: null, end_date: null, is_current: true })],
    }));
    expect(ids(r)).not.toContain("STRUCT_006");
  });
});

// ---------------------------------------------------------------------------
// Penalty math — no double counting
// ---------------------------------------------------------------------------

describe("structure — penalty math", () => {

  it("clean resume: zero total penalty", () => {
    const r = evaluateStructure(buildResume());
    expect(r.totalPenalty).toBe(0);
    expect(r.cap).toBeNull();
  });

  it("soft-check penalty is exactly half of rule scoreImpact", () => {
    const r = evaluateStructure(buildResume({
      experience: [],
      education: [],
      skills: { raw_list: [], categories: {} },
      parse_metadata: { detected_sections: ["experience", "education", "skills"] },
    }));
    // STRUCT_001: 40/2=20, STRUCT_002: 20/2=10, STRUCT_003: 20/2=10
    expect(pen(r, "STRUCT_001")).toBe(20);
    expect(pen(r, "STRUCT_002")).toBe(10);
    expect(pen(r, "STRUCT_003")).toBe(10);
    expect(r.totalPenalty).toBe(40);
    expect(r.cap).toBeNull();
  });

  it("truly missing all three sections: full penalties + lowest cap wins", () => {
    const r = evaluateStructure(buildResume({
      experience: [],
      education: [],
      skills: { raw_list: [], categories: {} },
      parse_metadata: { detected_sections: [] },
    }));
    expect(pen(r, "STRUCT_001")).toBe(40);
    expect(pen(r, "STRUCT_002")).toBe(20);
    expect(pen(r, "STRUCT_003")).toBe(20);
    expect(r.totalPenalty).toBe(80);
    expect(r.cap).toBe(40); // STRUCT_001 cap (lowest)
  });
});
