import { describe, it, expect } from "vitest";
import { evaluateParseability } from "../lib/rules/evaluators/evaluateParseability";
import { buildResume } from "./helpers";

function ruleIds(result: ReturnType<typeof evaluateParseability>) {
  return result.violations.map((v) => v.ruleId);
}

describe("evaluateParseability", () => {
  it("returns no violations for a well-formed resume", () => {
    const result = evaluateParseability(buildResume());
    expect(result.violations).toHaveLength(0);
    expect(result.totalPenalty).toBe(0);
    expect(result.cap).toBeNull();
  });

  it("PARSE_001: flags extremely short text", () => {
    const result = evaluateParseability(
      buildResume({ raw_text: "short", parse_metadata: { char_count: 5 } })
    );
    expect(ruleIds(result)).toContain("PARSE_001");
    expect(result.cap).not.toBeNull(); // PARSE_001 is a cap rule
  });

  it("PARSE_003: flags missing contact info", () => {
    const result = evaluateParseability(
      buildResume({ contact: { name: null, email: null, phone: null } })
    );
    expect(ruleIds(result)).toContain("PARSE_003");
  });

  it("PARSE_004: flags missing email", () => {
    const result = evaluateParseability(
      buildResume({ contact: { email: null } })
    );
    expect(ruleIds(result)).toContain("PARSE_004");
    expect(ruleIds(result)).not.toContain("PARSE_003"); // name + phone still present
  });

  it("PARSE_005: flags missing phone", () => {
    const result = evaluateParseability(
      buildResume({ contact: { phone: null } })
    );
    expect(ruleIds(result)).toContain("PARSE_005");
  });

  it("PARSE_006: flags no section headers", () => {
    const result = evaluateParseability(
      buildResume({ parse_metadata: { detected_sections: [] } })
    );
    expect(ruleIds(result)).toContain("PARSE_006");
  });

  it("PARSE_007: flags low word count", () => {
    const shortText = Array(50).fill("word").join(" "); // 50 words
    const result = evaluateParseability(
      buildResume({ raw_text: shortText, parse_metadata: { char_count: shortText.length } })
    );
    expect(ruleIds(result)).toContain("PARSE_007");
  });

  it("PARSE_008: flags missing candidate name", () => {
    const result = evaluateParseability(
      buildResume({ contact: { name: null } })
    );
    expect(ruleIds(result)).toContain("PARSE_008");
  });

  it("PARSE_009: flags missing LinkedIn and GitHub", () => {
    const result = evaluateParseability(
      buildResume({ contact: { linkedin: null, github: null } })
    );
    expect(ruleIds(result)).toContain("PARSE_009");
  });

  it("PARSE_009: does not fire when LinkedIn is present", () => {
    const result = evaluateParseability(
      buildResume({ contact: { github: null } }) // linkedin still present
    );
    expect(ruleIds(result)).not.toContain("PARSE_009");
  });
});
