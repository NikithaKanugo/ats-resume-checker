import { describe, it, expect } from "vitest";
import { evaluateContentQuality } from "../lib/rules/evaluators/evaluateContentQuality";
import { buildResume } from "./helpers";

function ruleIds(result: ReturnType<typeof evaluateContentQuality>) {
  return result.violations.map((v) => v.ruleId);
}

describe("evaluateContentQuality", () => {
  it("returns no violations for a well-formed resume", () => {
    const result = evaluateContentQuality(buildResume());
    // Default resume has strong bullets, metrics, and action verbs
    expect(result.violations).toHaveLength(0);
  });

  it("CONTENT_001: flags low quantification ratio", () => {
    const resume = buildResume();
    // Replace all bullets with non-quantified text
    resume.experience = resume.experience.map((e) => ({
      ...e,
      bullets: [
        "Worked on frontend development tasks.",
        "Collaborated with the backend team on features.",
        "Attended daily standup meetings regularly.",
        "Reviewed code for the mobile app.",
      ],
    }));
    const result = evaluateContentQuality(resume);
    expect(ruleIds(result)).toContain("CONTENT_001");
  });

  it("CONTENT_002: flags excessive weak verbs", () => {
    const resume = buildResume();
    resume.experience = resume.experience.map((e) => ({
      ...e,
      bullets: [
        "Helped with frontend development.",
        "Assisted the team with deployments.",
        "Worked on various backend tasks.",
        "Supported the QA process during releases.",
        "Used Python for scripting tasks.",
      ],
    }));
    const result = evaluateContentQuality(resume);
    expect(ruleIds(result)).toContain("CONTENT_002");
  });

  it("CONTENT_003: flags zero action verbs", () => {
    const resume = buildResume();
    // All bullets start with non-action, non-weak words
    resume.experience[0].bullets = [
      "The system was migrated to AWS.",
      "Data was processed using Spark.",
      "Reports were generated weekly.",
    ];
    resume.experience[1].bullets = [];
    const result = evaluateContentQuality(resume);
    expect(ruleIds(result)).toContain("CONTENT_003");
  });

  it("CONTENT_006: flags too few total bullets", () => {
    const resume = buildResume();
    resume.experience[0].bullets = ["Built REST APIs."];
    resume.experience[1].bullets = ["Wrote tests."];
    const result = evaluateContentQuality(resume);
    expect(ruleIds(result)).toContain("CONTENT_006");
  });

  it("CONTENT_007: flags first-person pronouns", () => {
    const resume = buildResume({
      raw_text: "I managed a team of engineers and my focus was on backend systems.",
    });
    const result = evaluateContentQuality(resume);
    expect(ruleIds(result)).toContain("CONTENT_007");
  });

  it("CONTENT_008: flags cliché phrases", () => {
    const resume = buildResume({
      raw_text: "Dynamic professional and team player with a proven track record.",
    });
    const result = evaluateContentQuality(resume);
    expect(ruleIds(result)).toContain("CONTENT_008");
  });

  it("CONTENT_010: flags too few skills", () => {
    const result = evaluateContentQuality(
      buildResume({ skills: { raw_list: ["Python", "SQL"], categories: {} } })
    );
    expect(ruleIds(result)).toContain("CONTENT_010");
  });

  it("CONTENT_010: does not fire when skills list has 5+", () => {
    const result = evaluateContentQuality(buildResume()); // default has 10 skills
    expect(ruleIds(result)).not.toContain("CONTENT_010");
  });
});
