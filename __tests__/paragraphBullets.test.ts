/**
 * Tests for paragraph-to-bullet fallback extraction.
 */
import { describe, it, expect } from "vitest";
import { buildResumeFromText } from "../lib/parsing/parseResume";
import { runResumeOnlyAnalysisFromText } from "../lib/orchestrators/runResumeOnlyAnalysis";

/** Build a resume with a single experience entry using the given body text. */
function parseEntry(body: string) {
  const text = `
Jane Doe
jane@test.com
555-000-0000

SUMMARY
Experienced developer.

EXPERIENCE
Backend Developer at TechCo
Jan 2022 – Present
${body}

EDUCATION
University
B.S. CS
2018 – 2022

SKILLS
Python, Java, Docker, AWS, PostgreSQL, Git, React, Node.js
`;
  return buildResumeFromText(text, "txt");
}

describe("paragraph-to-bullet fallback", () => {
  it("extracts sentences from a single paragraph", () => {
    const r = parseEntry(
      "Developed REST APIs serving mobile and web clients with Node.js and Express. " +
      "Managed PostgreSQL databases and implemented caching with Redis. " +
      "Collaborated with frontend team on API contracts and data models."
    );
    expect(r.experience[0].bullets.length).toBeGreaterThanOrEqual(3);
    expect(r.experience[0].bullets[0]).toContain("REST APIs");
    expect(r.experience[0].bullets[1]).toContain("PostgreSQL");
  });

  it("does NOT override real bullet markers when present", () => {
    const r = parseEntry(
      "• Built REST APIs handling 10K requests/sec.\n" +
      "• Reduced latency by 40%.\n" +
      "• Implemented CI/CD pipeline."
    );
    expect(r.experience[0].bullets.length).toBe(3);
    // Should be from marker extraction, not paragraph split
    expect(r.experience[0].bullets[0]).toContain("Built REST APIs");
  });

  it("handles semicolons as sentence boundaries", () => {
    const r = parseEntry(
      "Designed microservices architecture for payment platform; " +
      "implemented event-driven communication using Kafka; " +
      "reduced system downtime by 30% through automated failover."
    );
    expect(r.experience[0].bullets.length).toBeGreaterThanOrEqual(3);
  });

  it("does NOT split on abbreviations (e.g., Inc., Dr., etc.)", () => {
    const r = parseEntry(
      "Worked at Acme Inc. to build a customer-facing portal. " +
      "Collaborated with Dr. Smith on the ML pipeline. " +
      "Delivered results ahead of schedule."
    );
    const bullets = r.experience[0].bullets;
    // "Acme Inc." should NOT produce a false split
    expect(bullets.some((b) => b.includes("Acme Inc"))).toBe(true);
    // "Dr. Smith" should NOT produce a false split
    expect(bullets.some((b) => b.includes("Dr. Smith") || b.includes("Dr Smith"))).toBe(true);
  });

  it("filters out short fragments (< 20 chars)", () => {
    const r = parseEntry(
      "Built APIs. OK. Yes. Implemented comprehensive monitoring and alerting system for production services."
    );
    const bullets = r.experience[0].bullets;
    // "OK" and "Yes" should be filtered out
    expect(bullets.every((b) => b.length >= 20)).toBe(true);
    expect(bullets.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT treat date lines or locations as bullets", () => {
    const r = parseEntry(
      "Built scalable data pipeline processing 1TB daily. " +
      "Managed team of 4 engineers across two time zones."
    );
    const bullets = r.experience[0].bullets;
    for (const b of bullets) {
      expect(b).not.toMatch(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/);
      expect(b).not.toMatch(/^\d{4}$/);
    }
  });

  it("handles multi-line paragraph (lines without bullets)", () => {
    const r = parseEntry(
      "Developed REST APIs serving mobile and web clients\n" +
      "with Node.js and Express. Managed PostgreSQL databases\n" +
      "and implemented caching with Redis."
    );
    const bullets = r.experience[0].bullets;
    expect(bullets.length).toBeGreaterThanOrEqual(2);
  });

  it("handles multiple experience entries mixing bullets and paragraphs", () => {
    const text = `
Jane Doe
jane@test.com
555-000-0000

EXPERIENCE

Senior Developer — Acme Corp
Jan 2022 – Present
• Built REST APIs handling 10K requests/sec.
• Reduced latency by 40%.
• Implemented CI/CD pipeline.

Junior Developer — StartupX
Jun 2020 – Dec 2021
Developed frontend components using React. Built internal tools for the operations team. Automated reporting workflows saving 10 hours per week.

EDUCATION
University
B.S. CS
2018 – 2022

SKILLS
Python, Java, Docker, AWS, PostgreSQL, Git, React, Node.js
`;
    const r = buildResumeFromText(text, "txt");
    // Entry 0: real bullets
    expect(r.experience[0].bullets.length).toBe(3);
    // Entry 1: paragraph fallback
    expect(r.experience[1].bullets.length).toBeGreaterThanOrEqual(2);
    expect(r.experience[1].bullets[0]).toContain("React");
  });
});

describe("paragraph fallback — scoring impact", () => {
  it("paragraph resume now gets content quality evaluation", () => {
    const text = `
Tom Davis
tom@email.com
555-333-4444

SUMMARY
Backend developer with 3 years of experience.

EXPERIENCE
Backend Developer at TechCo
Jan 2022 – Present
Developed REST APIs serving mobile and web clients with Node.js and Express. Managed PostgreSQL databases and implemented caching with Redis. Collaborated with frontend team on API contracts. Built automated testing framework covering 80% of critical paths.

Junior Developer at StartupX
Jun 2020 – Dec 2021
Built internal tools for operations team using Python and Django. Automated reporting workflows saving 10 hours per week. Implemented monitoring dashboards with Grafana.

EDUCATION
State University
B.S. Computer Science
2016 – 2020

SKILLS
Node.js, Express, PostgreSQL, Redis, Docker, AWS, Python, Git
`;
    const r = runResumeOnlyAnalysisFromText(text);
    // Should now have bullets extracted
    const totalBullets = r.parsed_resume.experience.reduce(
      (sum, e) => sum + e.bullets.length, 0
    );
    expect(totalBullets).toBeGreaterThanOrEqual(5);

    // STRUCT_007 (no bullets) should NOT fire
    const noBulletIssues = r.issues.filter((i) => i.ruleId === "STRUCT_007");
    expect(noBulletIssues).toHaveLength(0);

    // CONTENT_006 (too few bullets) should NOT fire
    const fewBulletIssues = r.issues.filter((i) => i.ruleId === "CONTENT_006");
    expect(fewBulletIssues).toHaveLength(0);
  });
});
