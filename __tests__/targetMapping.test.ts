/**
 * Verifies that violations carry target_section and target_text
 * so the UI can highlight exact resume locations.
 */
import { describe, it, expect } from "vitest";
import { evaluateParseability } from "../lib/rules/evaluators/evaluateParseability";
import { evaluateStructure } from "../lib/rules/evaluators/evaluateStructure";
import { evaluateContentQuality } from "../lib/rules/evaluators/evaluateContentQuality";
import { runResumeOnlyAnalysisFromText } from "../lib/orchestrators/runResumeOnlyAnalysis";
import { toUIAnalysis } from "../lib/utils/toUIAnalysis";
import { buildResume } from "./helpers";

describe("target mapping — parseability", () => {
  it("PARSE_004 targets 'contact'", () => {
    const r = evaluateParseability(buildResume({ contact: { email: null } }));
    const v = r.violations.find((v) => v.ruleId === "PARSE_004");
    expect(v?.target_section).toBe("contact");
  });

  it("PARSE_009 targets 'contact'", () => {
    const r = evaluateParseability(
      buildResume({ contact: { linkedin: null, github: null } })
    );
    const v = r.violations.find((v) => v.ruleId === "PARSE_009");
    expect(v?.target_section).toBe("contact");
  });
});

describe("target mapping — structure", () => {
  it("STRUCT_001 targets 'experience'", () => {
    const r = evaluateStructure(buildResume({ experience: [] }));
    const v = r.violations.find((v) => v.ruleId === "STRUCT_001");
    expect(v?.target_section).toBe("experience");
  });

  it("STRUCT_003 targets 'skills'", () => {
    const r = evaluateStructure(
      buildResume({ skills: { raw_list: [], categories: {} } })
    );
    const v = r.violations.find((v) => v.ruleId === "STRUCT_003");
    expect(v?.target_section).toBe("skills");
  });

  it("STRUCT_012 targets 'summary'", () => {
    const r = evaluateStructure(buildResume({ summary: null }));
    const v = r.violations.find((v) => v.ruleId === "STRUCT_012");
    expect(v?.target_section).toBe("summary");
  });

  it("STRUCT_006 targets specific experience entry index", () => {
    const r = evaluateStructure(
      buildResume({
        experience: [
          {
            company: "Acme",
            title: "Dev",
            start_date: "Jan 2020",
            end_date: "Dec 2023",
            is_current: false,
            location: null,
            bullets: ["Built APIs."],
            raw_text: "",
          },
          {
            company: "Other",
            title: "Eng",
            start_date: null,
            end_date: null,
            is_current: false,
            location: null,
            bullets: ["Wrote tests."],
            raw_text: "",
          },
        ],
      })
    );
    const v = r.violations.find((v) => v.ruleId === "STRUCT_006");
    expect(v?.target_section).toBe("experience.1"); // second entry
  });

  it("STRUCT_013 targets 'experience.0'", () => {
    const resume = buildResume();
    resume.experience = [resume.experience[0]];
    const r = evaluateStructure(resume);
    const v = r.violations.find((v) => v.ruleId === "STRUCT_013");
    expect(v?.target_section).toBe("experience.0");
  });
});

describe("target mapping — content quality", () => {
  it("CONTENT_002 targets the first weak-verb bullet", () => {
    const resume = buildResume();
    resume.experience = resume.experience.map((e) => ({
      ...e,
      bullets: [
        "Helped with frontend development.",
        "Assisted the team with deployments.",
        "Worked on various backend tasks.",
        "Supported the QA process.",
        "Used Python for scripting.",
      ],
    }));
    const r = evaluateContentQuality(resume);
    const v = r.violations.find((v) => v.ruleId === "CONTENT_002");
    expect(v?.target_section).toMatch(/^experience\.\d+\.bullets$/);
    expect(v?.target_text).toContain("Helped");
  });

  it("CONTENT_010 targets 'skills'", () => {
    const r = evaluateContentQuality(
      buildResume({ skills: { raw_list: ["Python", "SQL"], categories: {} } })
    );
    const v = r.violations.find((v) => v.ruleId === "CONTENT_010");
    expect(v?.target_section).toBe("skills");
  });

  it("CONTENT_012 targets 'experience'", () => {
    const resume = buildResume({
      experience: [
        {
          company: "A", title: "Eng", start_date: "Jan 2023", end_date: "Dec 2024",
          is_current: false, location: null,
          bullets: ["Led migration.", "Built APIs.", "Reduced costs."],
          raw_text: "",
        },
        {
          company: "B", title: "Dev", start_date: "Jan 2020", end_date: "Jan 2022",
          is_current: false, location: null,
          bullets: ["Wrote tests.", "Built dashboard.", "Deployed apps."],
          raw_text: "",
        },
      ],
    });
    const r = evaluateContentQuality(resume);
    const v = r.violations.find((v) => v.ruleId === "CONTENT_012");
    expect(v?.target_section).toBe("experience");
  });
});

describe("target mapping — end-to-end via toUIAnalysis", () => {
  it("UIIssue.target_section is populated from the pipeline", () => {
    const result = runResumeOnlyAnalysisFromText(`
John Smith
john@email.com

EXPERIENCE
Developer at SomeCompany
2020 – 2022
Helped with frontend tasks.
Worked on backend services.
Assisted the QA team.

EDUCATION
State University
Bachelor's in CS
`);
    const ui = toUIAnalysis(result);
    // At least some issues should have target_section set
    const withTarget = ui.issues.filter((i) => i.target_section);
    expect(withTarget.length).toBeGreaterThan(0);
  });

  it("UIIssue.target_text is populated for bullet-level issues", () => {
    const result = runResumeOnlyAnalysisFromText(`
Jane Doe
jane@email.com
555-123-4567

SUMMARY
Experienced engineer.

EXPERIENCE
Engineer — Acme Corp
Jan 2020 – Dec 2023
• Helped with frontend tasks and basic JavaScript debugging.
• Assisted backend team with routine API maintenance work.
• Worked on deployment scripts for staging environments.
• Supported QA team during monthly release cycles and testing.

EDUCATION
MIT
B.S. CS
2016 – 2020

SKILLS
TypeScript, React, Node.js, Python, Docker, AWS, PostgreSQL, Git
`);
    const ui = toUIAnalysis(result);
    const withText = ui.issues.filter((i) => i.target_text);
    expect(withText.length).toBeGreaterThan(0);
    expect(withText[0].target_text).toBeTruthy();
  });
});
