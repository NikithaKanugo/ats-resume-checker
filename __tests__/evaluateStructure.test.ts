import { describe, it, expect } from "vitest";
import { evaluateStructure } from "../lib/rules/evaluators/evaluateStructure";
import { buildResume } from "./helpers";

function ruleIds(result: ReturnType<typeof evaluateStructure>) {
  return result.violations.map((v) => v.ruleId);
}

function penalty(result: ReturnType<typeof evaluateStructure>, ruleId: string) {
  return result.violations.find((v) => v.ruleId === ruleId)?.penalty ?? null;
}

describe("evaluateStructure", () => {
  it("returns no violations for a well-formed resume", () => {
    const result = evaluateStructure(buildResume());
    expect(result.violations).toHaveLength(0);
  });

  // ── Section-missing: truly missing (no header detected) ─────────────

  it("STRUCT_001: full penalty + cap when experience header NOT detected", () => {
    const result = evaluateStructure(
      buildResume({
        experience: [],
        parse_metadata: { detected_sections: ["education", "skills"] },
      })
    );
    expect(ruleIds(result)).toContain("STRUCT_001");
    expect(result.cap).not.toBeNull();
    expect(penalty(result, "STRUCT_001")).toBe(40); // full impact
  });

  it("STRUCT_002: full penalty + cap when education header NOT detected", () => {
    const result = evaluateStructure(
      buildResume({
        education: [],
        parse_metadata: { detected_sections: ["experience", "skills"] },
      })
    );
    expect(ruleIds(result)).toContain("STRUCT_002");
    expect(result.cap).not.toBeNull();
  });

  it("STRUCT_003: full penalty when skills header NOT detected", () => {
    const result = evaluateStructure(
      buildResume({
        skills: { raw_list: [], categories: {} },
        parse_metadata: { detected_sections: ["experience", "education"] },
      })
    );
    expect(ruleIds(result)).toContain("STRUCT_003");
    expect(penalty(result, "STRUCT_003")).toBe(20); // full impact
  });

  // ── Section-missing: detected but empty (parser weakness) ───────────

  it("STRUCT_001: soft penalty + NO cap when experience header detected but empty", () => {
    const result = evaluateStructure(
      buildResume({
        experience: [],
        parse_metadata: { detected_sections: ["experience", "education", "skills"] },
      })
    );
    expect(ruleIds(result)).toContain("STRUCT_001");
    expect(result.cap).toBeNull(); // no cap — parser weakness, not truly missing
    expect(penalty(result, "STRUCT_001")).toBe(20); // half of 40
  });

  it("STRUCT_002: soft penalty + NO cap when education header detected but empty", () => {
    const result = evaluateStructure(
      buildResume({
        education: [],
        parse_metadata: { detected_sections: ["experience", "education", "skills"] },
      })
    );
    expect(ruleIds(result)).toContain("STRUCT_002");
    expect(result.cap).toBeNull();
    expect(penalty(result, "STRUCT_002")).toBe(10); // half of 20
  });

  it("STRUCT_003: soft penalty when skills header detected but empty", () => {
    const result = evaluateStructure(
      buildResume({
        skills: { raw_list: [], categories: {} },
        parse_metadata: { detected_sections: ["experience", "education", "skills"] },
      })
    );
    expect(ruleIds(result)).toContain("STRUCT_003");
    expect(penalty(result, "STRUCT_003")).toBe(10); // half of 20
  });

  // ── Entry completeness (normal confidence) ──────────────────────────

  it("STRUCT_004: flags entries missing job title", () => {
    const result = evaluateStructure(
      buildResume({
        experience: [{
          company: "Acme", title: null,
          start_date: "Jan 2020", end_date: "Dec 2023",
          is_current: false, location: null,
          bullets: ["Did things."], raw_text: "",
        }],
      })
    );
    expect(ruleIds(result)).toContain("STRUCT_004");
  });

  it("STRUCT_005: flags entries missing company (title + bullets present)", () => {
    const result = evaluateStructure(
      buildResume({
        experience: [{
          company: null, title: "Engineer",
          start_date: "Jan 2020", end_date: "Dec 2023",
          is_current: false, location: null,
          bullets: ["Led migration."], raw_text: "",
        }],
      })
    );
    expect(ruleIds(result)).toContain("STRUCT_005");
  });

  it("STRUCT_006: flags missing dates when title AND company present", () => {
    const result = evaluateStructure(
      buildResume({
        experience: [{
          company: "Acme", title: "Engineer",
          start_date: null, end_date: null, is_current: false,
          location: null, bullets: ["Built APIs."], raw_text: "",
        }],
      })
    );
    expect(ruleIds(result)).toContain("STRUCT_006");
  });

  it("STRUCT_006: does NOT flag when company is missing (parse fragment)", () => {
    const result = evaluateStructure(
      buildResume({
        experience: [{
          company: null, title: "Engineer",
          start_date: null, end_date: null, is_current: false,
          location: null, bullets: ["Built APIs."], raw_text: "",
        }],
      })
    );
    expect(ruleIds(result)).not.toContain("STRUCT_006");
  });

  // ── Entry completeness suppressed on low confidence ─────────────────

  it("STRUCT_004-010: suppressed when parse confidence is low", () => {
    const result = evaluateStructure(
      buildResume({
        parse_metadata: { parse_confidence: "low" },
        experience: [{
          company: null, title: null,
          start_date: null, end_date: null, is_current: false,
          location: null, bullets: [], raw_text: "",
        }],
      })
    );
    const ids = ruleIds(result);
    // Entry-level completeness rules should NOT fire
    expect(ids).not.toContain("STRUCT_004");
    expect(ids).not.toContain("STRUCT_005");
    expect(ids).not.toContain("STRUCT_006");
    expect(ids).not.toContain("STRUCT_007");
    expect(ids).not.toContain("STRUCT_008");
    expect(ids).not.toContain("STRUCT_009");
    expect(ids).not.toContain("STRUCT_010");
  });

  it("STRUCT_004-010: fire normally on high confidence", () => {
    const result = evaluateStructure(
      buildResume({
        parse_metadata: { parse_confidence: "high" },
        experience: [{
          company: "Acme", title: null,
          start_date: "Jan 2020", end_date: "Dec 2023",
          is_current: false, location: null,
          bullets: ["Did things."], raw_text: "",
        }],
      })
    );
    expect(ruleIds(result)).toContain("STRUCT_004");
  });

  // ── Document shape ──────────────────────────────────────────────────

  it("STRUCT_012: flags missing summary", () => {
    const result = evaluateStructure(buildResume({ summary: null }));
    expect(ruleIds(result)).toContain("STRUCT_012");
  });

  it("STRUCT_013: flags single experience entry", () => {
    const resume = buildResume();
    resume.experience = [resume.experience[0]];
    const result = evaluateStructure(resume);
    expect(ruleIds(result)).toContain("STRUCT_013");
  });
});
