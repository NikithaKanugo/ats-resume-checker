/**
 * Fixture-based tests: paragraph-to-bullet fallback across varied
 * paragraph styles, abbreviation protection, and mixed entries.
 */
import { describe, it, expect } from "vitest";
import { buildResumeFromText } from "../lib/parsing/parseResume";

function expFromResume(text: string) {
  return buildResumeFromText(text, "txt");
}

const BASE = (body: string) => `
Name
email@test.com
555-000-0000

SUMMARY
Experienced developer.

EXPERIENCE
Developer at TechCo
Jan 2022 – Present
${body}

EDUCATION
University
B.S. CS
2018

SKILLS
Python, Java, Docker, AWS, PostgreSQL, Git, React, Node.js
`;

// ---------------------------------------------------------------------------
// Sentence splitting basics
// ---------------------------------------------------------------------------

describe("paragraph fallback — sentence splitting", () => {
  it("splits 3 sentences into 3 bullets", () => {
    const r = expFromResume(BASE(
      "Developed REST APIs serving mobile clients. " +
      "Managed PostgreSQL databases and Redis caching. " +
      "Collaborated with frontend team on data contracts."
    ));
    const bullets = r.experience[0].bullets;
    expect(bullets.length).toBeGreaterThanOrEqual(3);
    expect(bullets[0]).toContain("REST APIs");
    expect(bullets[1]).toContain("PostgreSQL");
    expect(bullets[2]).toContain("frontend");
  });

  it("splits on semicolons as sentence boundaries", () => {
    const r = expFromResume(BASE(
      "Designed microservices for payments; " +
      "implemented event-driven messaging with Kafka; " +
      "reduced system downtime by 30% through failover automation."
    ));
    expect(r.experience[0].bullets.length).toBeGreaterThanOrEqual(3);
  });

  it("handles multi-line paragraph (full sentences per line)", () => {
    const r = expFromResume(BASE(
      "Developed REST APIs serving mobile and web clients with low latency. " +
      "Built automated testing framework covering 80% of critical user flows."
    ));
    expect(r.experience[0].bullets.length).toBeGreaterThanOrEqual(2);
    expect(r.experience[0].bullets[0]).toContain("REST APIs");
    expect(r.experience[0].bullets[1]).toContain("testing framework");
  });
});

// ---------------------------------------------------------------------------
// Abbreviation protection
// ---------------------------------------------------------------------------

describe("paragraph fallback — abbreviation protection", () => {
  it("does NOT split on Inc.", () => {
    const r = expFromResume(BASE(
      "Worked at Acme Inc. to build a customer-facing portal. " +
      "Delivered results ahead of schedule."
    ));
    const bullets = r.experience[0].bullets;
    expect(bullets.some((b) => b.includes("Acme Inc"))).toBe(true);
  });

  it("does NOT split on Dr.", () => {
    const r = expFromResume(BASE(
      "Collaborated with Dr. Smith on the ML pipeline. " +
      "Improved model accuracy by 15%."
    ));
    const bullets = r.experience[0].bullets;
    const drBullet = bullets.find((b) => b.includes("Dr"));
    expect(drBullet).toContain("Smith");
  });

  it("does NOT split on e.g.", () => {
    const r = expFromResume(BASE(
      "Used modern frameworks e.g. React and Vue for frontend development. " +
      "Implemented CI/CD pipelines with Jenkins."
    ));
    const bullets = r.experience[0].bullets;
    expect(bullets.some((b) => b.includes("e.g") && b.includes("React"))).toBe(true);
  });

  it("does NOT split on U.S.", () => {
    const r = expFromResume(BASE(
      "Managed deployments across U.S. data centers. " +
      "Reduced latency for East Coast users by 20%."
    ));
    const bullets = r.experience[0].bullets;
    expect(bullets.some((b) => b.includes("U.S"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Fragment filtering
// ---------------------------------------------------------------------------

describe("paragraph fallback — fragment filtering", () => {
  it("filters out fragments shorter than 20 chars", () => {
    const r = expFromResume(BASE(
      "Built APIs. OK. Yes. Implemented comprehensive monitoring and alerting system for production services."
    ));
    const bullets = r.experience[0].bullets;
    expect(bullets.every((b) => b.length >= 20)).toBe(true);
  });

  it("does NOT produce bullets from pure date lines", () => {
    const r = expFromResume(BASE(
      "Led backend team to deliver new payment gateway. " +
      "Automated deployment pipeline reducing release time from days to hours."
    ));
    for (const b of r.experience[0].bullets) {
      expect(b).not.toMatch(/^\d{4}$/);
      expect(b).not.toMatch(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/);
    }
  });
});

// ---------------------------------------------------------------------------
// Does NOT override real bullets
// ---------------------------------------------------------------------------

describe("paragraph fallback — no override", () => {
  it("uses real bullet markers when present", () => {
    const r = expFromResume(BASE(
      "• Built REST APIs handling 10K requests/sec.\n" +
      "• Reduced latency by 40%.\n" +
      "• Implemented CI/CD pipeline."
    ));
    expect(r.experience[0].bullets).toHaveLength(3);
    expect(r.experience[0].bullets[0]).toContain("REST APIs");
    expect(r.parse_metadata.fallbacks_used.paragraph_to_bullet_fallback).toBe(false);
  });

  it("sets fallback flag when paragraph splitting is used", () => {
    const r = expFromResume(BASE(
      "Developed REST APIs. Managed databases. Built monitoring dashboards."
    ));
    expect(r.parse_metadata.fallbacks_used.paragraph_to_bullet_fallback).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mixed entries: some with bullets, some without
// ---------------------------------------------------------------------------

describe("paragraph fallback — mixed entries", () => {
  it("handles resume with bulleted + paragraph entries", () => {
    const r = expFromResume(`
Name
email@test.com
555-000-0000

EXPERIENCE

Senior Developer — Acme Corp
Jan 2022 – Present
• Built REST APIs handling 10K requests/sec.
• Reduced latency by 40%.
• Implemented CI/CD pipeline.

Junior Developer — StartupX
Jun 2020 – Dec 2021
Developed frontend components using React. Built internal tools for operations. Automated reporting workflows saving 10 hours per week.

EDUCATION
University
B.S. CS
2018

SKILLS
Python, Java, Docker, AWS, PostgreSQL, Git, React, Node.js
`);
    // Entry 0: real bullets
    expect(r.experience[0].bullets).toHaveLength(3);
    expect(r.experience[0].bullets[0]).toContain("REST APIs");

    // Entry 1: paragraph fallback
    expect(r.experience[1].bullets.length).toBeGreaterThanOrEqual(2);
    expect(r.experience[1].bullets[0]).toContain("React");
  });
});
