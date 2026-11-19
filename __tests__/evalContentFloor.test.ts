/**
 * Content-quality evaluator: zero-bullet penalty floor and
 * per-category rule triggering tests.
 *
 * Verifies that the three-tier system (zeroBulletRisk / lowBulletRisk / normal)
 * fires the right rules at the right thresholds and never silently bypasses.
 */
import { describe, it, expect } from "vitest";
import { evaluateContentQuality } from "../lib/rules/evaluators/evaluateContentQuality";
import { buildResume } from "./helpers";
import type { ExperienceEntry } from "../types/resume";

function ids(r: ReturnType<typeof evaluateContentQuality>) {
  return r.violations.map((v) => v.ruleId);
}

function entry(o: Partial<ExperienceEntry> = {}): ExperienceEntry {
  return {
    company: "Co", title: "Eng",
    start_date: "Jan 2020", end_date: "Dec 2023",
    is_current: false, location: null,
    bullets: [
      "Led migration reducing deploy time by 60%.",
      "Built APIs handling 10K requests/sec.",
      "Implemented CI/CD cutting releases to daily.",
    ],
    raw_text: "Engineer at Co, did many things across multiple projects and deliverables over several years.",
    ...o,
  };
}

// ---------------------------------------------------------------------------
// Zero-bullet penalty floor
// ---------------------------------------------------------------------------

describe("content — zero-bullet penalty floor", () => {

  it("fires CONTENT_003 + CONTENT_001 + CONTENT_006 when experience text exists but 0 bullets", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [
        entry({ bullets: [], raw_text: "Built REST APIs and managed PostgreSQL databases for production services." }),
      ],
    }));
    const fired = ids(r);
    expect(fired).toContain("CONTENT_006"); // too few bullets
    expect(fired).toContain("CONTENT_003"); // no action verbs (floor)
    expect(fired).toContain("CONTENT_001"); // 0% quantified (floor)
  });

  it("penalty floor sums to at least 55 points", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [
        entry({ bullets: [], raw_text: "Developed scalable backend services and managed cloud infrastructure for enterprise clients." }),
        entry({ bullets: [], raw_text: "Built internal tooling and automated deployment pipelines for the engineering team." }),
      ],
    }));
    // CONTENT_006=15 + CONTENT_003=25 + CONTENT_001=20 = 60
    expect(r.totalPenalty).toBeGreaterThanOrEqual(55);
  });

  it("does NOT fire floor when entries have empty raw_text (structural, not content issue)", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [entry({ bullets: [], raw_text: "" })],
    }));
    expect(ids(r)).not.toContain("CONTENT_003");
    expect(ids(r)).not.toContain("CONTENT_001");
    // CONTENT_006 still fires (too few bullets regardless)
    expect(ids(r)).toContain("CONTENT_006");
  });

  it("does NOT fire floor when experience array is empty", () => {
    const r = evaluateContentQuality(buildResume({ experience: [] }));
    expect(ids(r)).not.toContain("CONTENT_003");
    expect(ids(r)).not.toContain("CONTENT_001");
  });

  it("does NOT fire floor when bullets ARE extracted", () => {
    const r = evaluateContentQuality(buildResume({ experience: [entry()] }));
    expect(ids(r)).not.toContain("CONTENT_003");
  });

  it("raw_text under 50 chars does NOT trigger floor (too short to be meaningful)", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [entry({ bullets: [], raw_text: "Short." })],
    }));
    expect(ids(r)).not.toContain("CONTENT_003");
  });
});

// ---------------------------------------------------------------------------
// Low-bullet tier (1–2 bullets)
// ---------------------------------------------------------------------------

describe("content — low-bullet tier (1–2 bullets)", () => {

  it("CONTENT_001 fires when 0 of 2 bullets are quantified", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [entry({
        bullets: ["Attended daily standup meetings.", "Participated in sprint planning sessions."],
      })],
    }));
    expect(ids(r)).toContain("CONTENT_001");
  });

  it("CONTENT_001 does NOT fire when 1 of 2 bullets has a metric", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [entry({
        bullets: ["Reduced latency by 40%.", "Attended meetings."],
      })],
    }));
    expect(ids(r)).not.toContain("CONTENT_001");
  });

  it("CONTENT_002 fires when 2 of 2 bullets use weak verbs (100% > 50% threshold)", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [entry({
        bullets: ["Helped build the frontend interface.", "Assisted with deployment automation."],
      })],
    }));
    expect(ids(r)).toContain("CONTENT_002");
  });

  it("CONTENT_002 does NOT fire when 1 of 2 bullets uses weak verb (50% = threshold, not >)", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [entry({
        bullets: ["Built REST APIs for mobile clients.", "Helped with testing."],
      })],
    }));
    expect(ids(r)).not.toContain("CONTENT_002");
  });

  it("CONTENT_009 fires when 2 of 2 bullets are responsibility-focused", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [entry({
        bullets: [
          "Responsible for managing the production infrastructure.",
          "Duties included monitoring alerts and incident response.",
        ],
      })],
    }));
    expect(ids(r)).toContain("CONTENT_009");
  });

  it("CONTENT_005 fires when 2 of 2 bullets are too short", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [entry({
        bullets: ["Did X.", "Did Y."],
      })],
    }));
    expect(ids(r)).toContain("CONTENT_005");
  });

  it("CONTENT_004 fires when 2 of 2 bullets are too long", () => {
    const long = "Led " + "a".repeat(210) + " initiative.";
    const r = evaluateContentQuality(buildResume({
      experience: [entry({ bullets: [long, long] })],
    }));
    expect(ids(r)).toContain("CONTENT_004");
  });
});

// ---------------------------------------------------------------------------
// Normal tier (3+ bullets) — standard thresholds
// ---------------------------------------------------------------------------

describe("content — normal tier (3+ bullets)", () => {

  it("clean resume: zero content violations", () => {
    const r = evaluateContentQuality(buildResume());
    expect(r.violations).toHaveLength(0);
    expect(r.totalPenalty).toBe(0);
  });

  it("CONTENT_001 fires when < 25% of 4+ bullets are quantified", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [entry({
        bullets: [
          "Collaborated with the frontend team on features.",
          "Attended daily standup meetings regularly.",
          "Reviewed code for the mobile app components.",
          "Managed the internal documentation wiki.",
        ],
      })],
    }));
    expect(ids(r)).toContain("CONTENT_001");
  });

  it("CONTENT_001 does NOT fire when > 25% of bullets have metrics", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [entry({
        bullets: [
          "Reduced latency by 40% through caching.",
          "Grew team from 3 to 8 engineers.",
          "Reviewed code for quality.",
          "Managed internal wiki.",
        ],
      })],
    }));
    // 2 of 4 = 50% quantified → above threshold
    expect(ids(r)).not.toContain("CONTENT_001");
  });

  it("CONTENT_002 fires when > 30% of bullets start with weak verbs", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [entry({
        bullets: [
          "Helped design the frontend architecture.",
          "Assisted with backend deployment scripts.",
          "Worked on various database migration tasks.",
          "Built real-time monitoring dashboard.",
        ],
      })],
    }));
    // 3/4 = 75% weak → fires
    expect(ids(r)).toContain("CONTENT_002");
  });

  it("CONTENT_003 fires when 0 action verbs across all bullets", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [entry({
        bullets: [
          "The system was migrated to AWS cloud.",
          "Data was processed using Apache Spark.",
          "Reports were generated on a weekly basis.",
        ],
      })],
    }));
    expect(ids(r)).toContain("CONTENT_003");
  });

  it("CONTENT_003 does NOT fire when at least 1 action verb present", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [entry({
        bullets: [
          "Built REST APIs for the platform.",
          "The system was upgraded to v2.",
          "Data was migrated to new cluster.",
        ],
      })],
    }));
    expect(ids(r)).not.toContain("CONTENT_003");
  });
});

// ---------------------------------------------------------------------------
// Category-level rule triggering
// ---------------------------------------------------------------------------

describe("content — category-level rules", () => {

  it("CONTENT_007 fires for first-person pronouns in raw_text", () => {
    const r = evaluateContentQuality(buildResume({
      raw_text: "I managed a team of engineers and my focus was on scalable backend systems.",
    }));
    expect(ids(r)).toContain("CONTENT_007");
  });

  it("CONTENT_007 does NOT fire without pronouns", () => {
    const r = evaluateContentQuality(buildResume());
    expect(ids(r)).not.toContain("CONTENT_007");
  });

  it("CONTENT_008 fires for cliche phrases", () => {
    const r = evaluateContentQuality(buildResume({
      raw_text: "Dynamic professional and team player with a proven track record of delivering results.",
    }));
    expect(ids(r)).toContain("CONTENT_008");
  });

  it("CONTENT_010 fires when 1–4 skills listed", () => {
    const r = evaluateContentQuality(buildResume({
      skills: { raw_list: ["Python", "SQL"], categories: {} },
    }));
    expect(ids(r)).toContain("CONTENT_010");
  });

  it("CONTENT_010 does NOT fire when 0 skills (that's a structure issue)", () => {
    const r = evaluateContentQuality(buildResume({
      skills: { raw_list: [], categories: {} },
    }));
    expect(ids(r)).not.toContain("CONTENT_010");
  });

  it("CONTENT_010 does NOT fire when 5+ skills listed", () => {
    const r = evaluateContentQuality(buildResume());
    expect(ids(r)).not.toContain("CONTENT_010");
  });

  it("CONTENT_012 fires for employment gap > 6 months", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [
        entry({ start_date: "Jan 2024", end_date: "Dec 2024" }),
        entry({ start_date: "Jan 2020", end_date: "Jan 2023" }),
      ],
    }));
    expect(ids(r)).toContain("CONTENT_012");
  });

  it("CONTENT_012 does NOT fire for continuous employment", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [
        entry({ start_date: "Jan 2022", end_date: "Dec 2024" }),
        entry({ start_date: "Jun 2019", end_date: "Dec 2021" }),
      ],
    }));
    expect(ids(r)).not.toContain("CONTENT_012");
  });
});

// ---------------------------------------------------------------------------
// Target section on violations
// ---------------------------------------------------------------------------

describe("content — target_section mapping", () => {

  it("zero-bullet floor violations target 'experience'", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [entry({ bullets: [], raw_text: "Built REST APIs and managed databases for production services." })],
    }));
    const content003 = r.violations.find((v) => v.ruleId === "CONTENT_003");
    const content001 = r.violations.find((v) => v.ruleId === "CONTENT_001");
    expect(content003?.target_section).toBe("experience");
    expect(content001?.target_section).toBe("experience");
  });

  it("bullet-level violations include entry index and target_text", () => {
    const r = evaluateContentQuality(buildResume({
      experience: [entry({
        bullets: [
          "Helped with frontend tasks and basic debugging work.",
          "Assisted the backend team with various deployments.",
          "Worked on testing scripts for the QA pipeline.",
          "Supported the design team during the product launch.",
        ],
      })],
    }));
    const weak = r.violations.find((v) => v.ruleId === "CONTENT_002");
    expect(weak?.target_section).toMatch(/^experience\.\d+\.bullets$/);
    expect(weak?.target_text).toBeTruthy();
  });

  it("skills violations target 'skills'", () => {
    const r = evaluateContentQuality(buildResume({
      skills: { raw_list: ["Python", "SQL"], categories: {} },
    }));
    const v = r.violations.find((v) => v.ruleId === "CONTENT_010");
    expect(v?.target_section).toBe("skills");
  });
});
