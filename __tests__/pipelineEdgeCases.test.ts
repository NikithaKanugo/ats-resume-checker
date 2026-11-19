/**
 * Integration tests: full pipeline (text → parse → evaluate → score)
 * with varied resume formats, malformed inputs, and score validation.
 */
import { describe, it, expect } from "vitest";
import { runResumeOnlyAnalysisFromText } from "../lib/orchestrators/runResumeOnlyAnalysis";
import type { AnalysisResult } from "../types/analysis";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const STRONG_RESUME = `
Sarah Chen
sarah.chen@email.com
415-555-0199
San Francisco, CA
linkedin.com/in/sarahchen
github.com/sarahchen

SUMMARY
Staff software engineer with 8 years of experience specializing in distributed systems, platform engineering, and engineering leadership. Proven ability to design scalable architectures serving millions of users.

EXPERIENCE

Staff Engineer — Stripe
Jan 2022 – Present
• Architected event-driven payment processing pipeline handling 50M daily transactions with 99.99% uptime SLA.
• Reduced p99 API latency from 450ms to 120ms by redesigning the database query layer with read replicas and caching.
• Led cross-functional initiative to migrate 12 services from monolith to microservices, enabling independent deploys for 6 teams.
• Mentored 5 senior engineers and established architecture review process adopted org-wide.
• Built real-time fraud detection system processing $2B in monthly transaction volume.
• Implemented feature flag infrastructure serving 200M flag evaluations/day with sub-5ms overhead.

Senior Engineer — Airbnb
Mar 2018 – Dec 2021
• Designed and launched search ranking service improving booking conversion by 15% across 4M listings.
• Built A/B testing platform used by 50+ product teams, processing 1B events daily.
• Reduced infrastructure costs by $1.2M annually by optimizing Kubernetes resource allocation.
• Led migration from Python 2 to Python 3 across 200+ services with zero production incidents.

Software Engineer — Dropbox
Jun 2016 – Feb 2018
• Developed file sync engine handling 1.5B file operations daily across desktop and mobile clients.
• Implemented delta sync algorithm reducing bandwidth usage by 40% for large file updates.
• Created automated performance regression suite catching 90% of latency issues before production.

EDUCATION
Stanford University
M.S. Computer Science — Distributed Systems
Sep 2014 – Jun 2016

UC Berkeley
B.S. Computer Science
Aug 2010 – May 2014

SKILLS
Languages: Go, Python, Java, TypeScript, Rust, SQL
Frameworks: gRPC, GraphQL, React, Next.js, FastAPI, Spring Boot
Infrastructure: Kubernetes, Docker, Terraform, AWS (ECS, Lambda, DynamoDB, S3), GCP
Databases: PostgreSQL, Redis, Cassandra, Elasticsearch, DynamoDB
Observability: DataDog, Grafana, PagerDuty, OpenTelemetry
Practices: System Design, Distributed Systems, CI/CD, TDD, Architecture Reviews
`;

const CAREER_CHANGER = `
Mike Torres
mike.torres@email.com
212-555-0188

SUMMARY
Former high school teacher transitioning to software development. Completed intensive bootcamp and built several full-stack projects.

EXPERIENCE
Teaching Fellow — CodeAcademy Bootcamp
Sep 2024 – Dec 2024
• Assisted 30 students with JavaScript and React fundamentals.
• Graded weekly coding assignments and provided feedback.

High School Math Teacher — Lincoln High
Aug 2018 – Jun 2024
• Taught algebra and calculus to classes of 30 students.
• Developed curriculum materials for AP Calculus.

EDUCATION
CodeAcademy Full-Stack Bootcamp
Certificate in Full-Stack Development
2024

University of Texas
B.A. Mathematics
2014 – 2018

SKILLS
JavaScript, React, Node.js, PostgreSQL, Git
`;

const ALL_NUMERIC_DATES = `
Priya Sharma
priya@email.com
555-111-2222

EXPERIENCE
Software Engineer
Microsoft
08/2022 – 03/2025
• Built Azure DevOps pipeline features.
• Reduced build times by 40%.
• Implemented automated testing framework.

Intern
Google
05/2022 – 08/2022
• Developed internal tooling for SRE team.
• Built monitoring dashboard.

EDUCATION
IIT Delhi
B.Tech Computer Science
07/2018 – 05/2022

SKILLS
C++, Python, Java, Docker, Kubernetes, Azure
`;

const TWO_DIGIT_YEAR_DATES = `
Alex Kim
alex@email.com
555-333-4444

EXPERIENCE
Developer — StartupCo
01/23 – 12/24
• Built mobile app with React Native.
• Integrated payment processing with Stripe.
• Achieved 50K downloads in first quarter.

EDUCATION
State University
B.S. Computer Science
08/19 – 05/23

SKILLS
React Native, TypeScript, Node.js, PostgreSQL
`;

const MISSING_EVERYTHING = `
Anonymous Person
`;

const REPEATED_SECTIONS = `
John Doe
john@email.com
555-123-4567

EXPERIENCE
Developer — CompanyA
2020 – 2022
• Built web applications.
• Managed database operations.
• Deployed to cloud infrastructure.

EXPERIENCE
Intern — CompanyB
2019 – 2020
• Assisted with frontend development.
• Wrote unit tests for core modules.

EDUCATION
University
B.S. CS
2015 – 2019

SKILLS
Python, JavaScript, SQL, Docker
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assertValidResult(result: AnalysisResult) {
  expect(result.analysis_id).toBeTruthy();
  expect(result.scoring_mode).toBe("resume_only");
  expect(result.overall_score).toBeGreaterThanOrEqual(0);
  expect(result.overall_score).toBeLessThanOrEqual(100);
  expect(result.subscores).toHaveLength(3);
  expect(result.parsed_resume).toBeTruthy();
  for (const sub of result.subscores) {
    expect(sub.raw_score).toBeGreaterThanOrEqual(0);
    expect(sub.raw_score).toBeLessThanOrEqual(100);
    expect(sub.weighted_score).toBeGreaterThanOrEqual(0);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("pipeline – strong resume", () => {
  it("scores very high (80+)", () => {
    const r = runResumeOnlyAnalysisFromText(STRONG_RESUME);
    assertValidResult(r);
    expect(r.overall_score).toBeGreaterThanOrEqual(80);
  });

  it("has few or no issues", () => {
    const r = runResumeOnlyAnalysisFromText(STRONG_RESUME);
    expect(r.issues.length).toBeLessThanOrEqual(3);
  });

  it("detects multiple strengths", () => {
    const r = runResumeOnlyAnalysisFromText(STRONG_RESUME);
    expect(r.strengths.length).toBeGreaterThanOrEqual(3);
  });

  it("correctly parses 3 experience entries", () => {
    const r = runResumeOnlyAnalysisFromText(STRONG_RESUME);
    expect(r.parsed_resume.experience.length).toBe(3);
  });

  it("correctly parses 2 education entries", () => {
    const r = runResumeOnlyAnalysisFromText(STRONG_RESUME);
    expect(r.parsed_resume.education.length).toBe(2);
  });
});

describe("pipeline – career changer", () => {
  it("produces a valid result with moderate score", () => {
    const r = runResumeOnlyAnalysisFromText(CAREER_CHANGER);
    assertValidResult(r);
    expect(r.overall_score).toBeGreaterThanOrEqual(40);
    expect(r.overall_score).toBeLessThanOrEqual(95);
  });

  it("scores lower than a strong resume", () => {
    const strong = runResumeOnlyAnalysisFromText(STRONG_RESUME);
    const changer = runResumeOnlyAnalysisFromText(CAREER_CHANGER);
    expect(changer.overall_score).toBeLessThan(strong.overall_score);
  });
});

describe("pipeline – numeric date formats", () => {
  it("parses MM/YYYY dates correctly", () => {
    const r = runResumeOnlyAnalysisFromText(ALL_NUMERIC_DATES);
    assertValidResult(r);
    expect(r.parsed_resume.experience.length).toBeGreaterThanOrEqual(1);
    const first = r.parsed_resume.experience[0];
    expect(first.start_date).toBeTruthy();
    expect(first.end_date || first.is_current).toBeTruthy();
  });

  it("does not flag missing dates when MM/YYYY dates exist", () => {
    const r = runResumeOnlyAnalysisFromText(ALL_NUMERIC_DATES);
    const dateIssues = r.issues.filter((i) => i.ruleId === "STRUCT_006");
    expect(dateIssues).toHaveLength(0);
  });
});

describe("pipeline – two-digit year dates", () => {
  it("parses MM/YY dates without crashing", () => {
    const r = runResumeOnlyAnalysisFromText(TWO_DIGIT_YEAR_DATES);
    assertValidResult(r);
    expect(r.parsed_resume.experience[0].start_date).toBeTruthy();
  });
});

describe("pipeline – missing everything", () => {
  it("does not crash on near-empty resume", () => {
    const r = runResumeOnlyAnalysisFromText(MISSING_EVERYTHING);
    assertValidResult(r);
  });

  it("scores very low", () => {
    const r = runResumeOnlyAnalysisFromText(MISSING_EVERYTHING);
    expect(r.overall_score).toBeLessThan(50);
  });

  it("generates multiple issues", () => {
    const r = runResumeOnlyAnalysisFromText(MISSING_EVERYTHING);
    expect(r.issues.length).toBeGreaterThanOrEqual(5);
  });

  it("still populates metadata", () => {
    const r = runResumeOnlyAnalysisFromText(MISSING_EVERYTHING);
    expect(r.metadata.resume_char_count).toBeGreaterThanOrEqual(0);
    expect(r.metadata.parse_confidence).toBeTruthy();
  });
});

describe("pipeline – repeated section headers", () => {
  it("handles duplicate EXPERIENCE headers", () => {
    const r = runResumeOnlyAnalysisFromText(REPEATED_SECTIONS);
    assertValidResult(r);
    // Both experience blocks should be parsed (merged or separate)
    expect(r.parsed_resume.experience.length).toBeGreaterThanOrEqual(1);
  });
});

describe("pipeline – score invariants", () => {
  const fixtures = [
    STRONG_RESUME,
    CAREER_CHANGER,
    ALL_NUMERIC_DATES,
    TWO_DIGIT_YEAR_DATES,
    MISSING_EVERYTHING,
    REPEATED_SECTIONS,
  ];

  for (const [i, fixture] of fixtures.entries()) {
    it(`fixture ${i}: overall score equals sum of weighted subscores`, () => {
      const r = runResumeOnlyAnalysisFromText(fixture);
      const sum = r.subscores.reduce((s, c) => s + c.weighted_score, 0);
      expect(Math.abs(r.overall_score - sum)).toBeLessThan(1);
    });

    it(`fixture ${i}: priority fixes ≤ 5`, () => {
      const r = runResumeOnlyAnalysisFromText(fixture);
      expect(r.priority_fixes.length).toBeLessThanOrEqual(5);
    });

    it(`fixture ${i}: each priority fix has target_section`, () => {
      const r = runResumeOnlyAnalysisFromText(fixture);
      for (const fix of r.priority_fixes) {
        expect(fix.target_section).toBeTruthy();
      }
    });

    it(`fixture ${i}: each priority fix has non-negative weighted_lift`, () => {
      const r = runResumeOnlyAnalysisFromText(fixture);
      for (const fix of r.priority_fixes) {
        expect(fix.weighted_lift).toBeGreaterThanOrEqual(0);
      }
    });
  }
});
