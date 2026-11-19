import { describe, it, expect } from "vitest";
import { runResumeOnlyAnalysisFromText } from "../lib/orchestrators/runResumeOnlyAnalysis";
import type { AnalysisResult } from "../types/analysis";

const WELL_FORMED_RESUME = `
Jane Doe
jane@example.com
555-123-4567
linkedin.com/in/janedoe

SUMMARY
Senior software engineer with 6 years of experience building scalable distributed systems.

EXPERIENCE
Senior Software Engineer — Acme Corp
Jan 2021 – Present
• Led migration of monolith to microservices, reducing deploy time by 60%.
• Built REST APIs handling 10K requests/sec with sub-50ms latency.
• Implemented CI/CD pipeline cutting release cycles from weekly to daily.
• Mentored 3 junior engineers and conducted 50+ code reviews.

Software Engineer — Startup Inc
Jun 2018 – Dec 2020
• Developed React frontend serving 5K daily active users.
• Reduced page load time by 40% through code splitting and lazy loading.
• Wrote integration tests covering 85% of critical user flows.

EDUCATION
MIT — B.S. Computer Science
Sep 2014 – May 2018

SKILLS
TypeScript, React, Node.js, Python, PostgreSQL, Docker, AWS, Git, REST APIs, CI/CD
`;

const MINIMAL_RESUME = `
John Smith
john@email.com

EXPERIENCE
Developer at SomeCompany
2020 – 2022
Did some development work.

EDUCATION
State University
Bachelor's in CS
`;

describe("full analysis pipeline", () => {
  it("produces a valid AnalysisResult for a well-formed resume", () => {
    const result = runResumeOnlyAnalysisFromText(WELL_FORMED_RESUME);
    assertValidResult(result);
    expect(result.overall_score).toBeGreaterThanOrEqual(60);
    expect(result.issues.length).toBeGreaterThanOrEqual(0);
    expect(result.priority_fixes.length).toBeLessThanOrEqual(5);
    expect(result.gap_report).toBeNull(); // resume-only mode
  });

  it("scores a minimal resume lower than a well-formed one", () => {
    const good = runResumeOnlyAnalysisFromText(WELL_FORMED_RESUME);
    const bad = runResumeOnlyAnalysisFromText(MINIMAL_RESUME);
    expect(bad.overall_score).toBeLessThan(good.overall_score);
  });

  it("generates priority fixes sorted by severity", () => {
    const result = runResumeOnlyAnalysisFromText(MINIMAL_RESUME);
    expect(result.priority_fixes.length).toBeGreaterThan(0);
    // Each fix has required fields
    for (const fix of result.priority_fixes) {
      expect(fix.title).toBeTruthy();
      expect(fix.suggestion).toBeTruthy();
      expect(fix.weighted_lift).toBeGreaterThanOrEqual(0);
    }
  });

  it("includes parsed_resume with contact info", () => {
    const result = runResumeOnlyAnalysisFromText(WELL_FORMED_RESUME);
    expect(result.parsed_resume.contact.name).toBe("Jane Doe");
    expect(result.parsed_resume.contact.email).toBe("jane@example.com");
  });

  it("does not crash on empty input", () => {
    const result = runResumeOnlyAnalysisFromText("");
    assertValidResult(result);
    expect(result.overall_score).toBeLessThan(50);
  });

  it("does not crash on garbage input", () => {
    const result = runResumeOnlyAnalysisFromText("@#$%^&*()!~`{}[]|\\");
    assertValidResult(result);
  });

  it("subscores sum to overall score", () => {
    const result = runResumeOnlyAnalysisFromText(WELL_FORMED_RESUME);
    const sumWeighted = result.subscores.reduce((s, c) => s + c.weighted_score, 0);
    expect(Math.abs(result.overall_score - sumWeighted)).toBeLessThan(1);
  });
});

function assertValidResult(result: AnalysisResult) {
  expect(result.analysis_id).toBeTruthy();
  expect(result.created_at).toBeTruthy();
  expect(result.scoring_mode).toBe("resume_only");
  expect(result.overall_score).toBeGreaterThanOrEqual(0);
  expect(result.overall_score).toBeLessThanOrEqual(100);
  expect(result.subscores).toHaveLength(3); // resume-only: 3 categories
  expect(Array.isArray(result.issues)).toBe(true);
  expect(Array.isArray(result.strengths)).toBe(true);
  expect(Array.isArray(result.priority_fixes)).toBe(true);
  expect(result.parsed_resume).toBeTruthy();
}
