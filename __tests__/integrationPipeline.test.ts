/**
 * End-to-end integration tests: text → parse → evaluate → score → result.
 *
 * Each fixture is a complete resume that flows through the entire pipeline.
 * Tests verify parsing accuracy, correct rule triggering, subscore values,
 * and overall score reasonableness — NOT individual rule logic.
 */
import { describe, it, expect } from "vitest";
import { runResumeOnlyAnalysisFromText } from "../lib/orchestrators/runResumeOnlyAnalysis";
import type { AnalysisResult } from "../types/analysis";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function ruleIds(r: AnalysisResult) {
  return r.issues.map((v) => v.ruleId);
}

function sub(r: AnalysisResult, category: string) {
  return r.subscores.find((s) => s.category === category)!;
}

function assertValid(r: AnalysisResult) {
  expect(r.analysis_id).toBeTruthy();
  expect(r.scoring_mode).toBe("resume_only");
  expect(r.overall_score).toBeGreaterThanOrEqual(0);
  expect(r.overall_score).toBeLessThanOrEqual(100);
  expect(r.subscores).toHaveLength(3);
  expect(r.parsed_resume).toBeTruthy();
  expect(r.gap_report).toBeNull();
  // Weighted subscores must sum to overall
  const sum = r.subscores.reduce((s, c) => s + c.weighted_score, 0);
  expect(Math.abs(r.overall_score - sum)).toBeLessThan(1);
}

// ---------------------------------------------------------------------------
// Fixture 1: Strong resume (gold standard)
// ---------------------------------------------------------------------------

const STRONG = `
Sarah Chen
sarah.chen@email.com
415-555-0199
San Francisco, CA
linkedin.com/in/sarahchen
github.com/sarahchen

SUMMARY
Staff software engineer with 8 years of experience designing and operating distributed systems at scale. Proven track record of reducing costs, improving latency, and leading cross-functional teams.

EXPERIENCE

Staff Engineer — Stripe
Jan 2022 – Present
• Architected event-driven payment pipeline handling 50M daily transactions with 99.99% uptime SLA.
• Reduced p99 API latency from 450ms to 120ms by redesigning the query layer with read replicas.
• Led initiative to migrate 12 services from monolith to microservices for 6 independent teams.
• Mentored 5 senior engineers and established architecture review process adopted org-wide.
• Built real-time fraud detection system processing $2B in monthly volume.

Senior Engineer — Airbnb
Mar 2018 – Dec 2021
• Designed search ranking service improving booking conversion by 15% across 4M listings.
• Built A/B testing platform used by 50+ product teams processing 1B events daily.
• Reduced infrastructure costs by $1.2M annually via Kubernetes resource optimization.
• Led Python 2 to 3 migration across 200+ services with zero production incidents.

Software Engineer — Dropbox
Jun 2016 – Feb 2018
• Developed file sync engine handling 1.5B daily operations across desktop and mobile.
• Implemented delta sync algorithm reducing bandwidth usage by 40%.
• Created automated performance regression suite catching 90% of issues pre-production.

EDUCATION
Stanford University
M.S. Computer Science
Sep 2014 – Jun 2016

UC Berkeley
B.S. Computer Science
Aug 2010 – May 2014

SKILLS
Languages: Go, Python, TypeScript, Java, Rust, SQL
Infrastructure: Kubernetes, Docker, Terraform, AWS (ECS, Lambda, S3), GCP
Databases: PostgreSQL, Redis, Cassandra, Elasticsearch, DynamoDB
Observability: DataDog, Grafana, PagerDuty, OpenTelemetry
Practices: System Design, Distributed Systems, CI/CD, TDD
`;

describe("integration — strong resume", () => {
  const r = runResumeOnlyAnalysisFromText(STRONG);

  it("produces valid result", () => assertValid(r));

  it("scores 85+", () => {
    expect(r.overall_score).toBeGreaterThanOrEqual(85);
  });

  it("parses 3 experience entries with correct companies", () => {
    const exp = r.parsed_resume.experience;
    expect(exp).toHaveLength(3);
    expect(exp[0].company).toContain("Stripe");
    expect(exp[1].company).toContain("Airbnb");
    expect(exp[2].company).toContain("Dropbox");
  });

  it("extracts dates for all entries", () => {
    for (const e of r.parsed_resume.experience) {
      expect(e.start_date).toBeTruthy();
      expect(e.end_date || e.is_current).toBeTruthy();
    }
  });

  it("extracts bullets for all entries (12+ total)", () => {
    const total = r.parsed_resume.experience.reduce((s, e) => s + e.bullets.length, 0);
    expect(total).toBeGreaterThanOrEqual(12);
  });

  it("parses 2 education entries", () => {
    expect(r.parsed_resume.education).toHaveLength(2);
    expect(r.parsed_resume.education[0].institution).toContain("Stanford");
    expect(r.parsed_resume.education[1].institution).toContain("Berkeley");
  });

  it("extracts 20+ skills", () => {
    expect(r.parsed_resume.skills.raw_list.length).toBeGreaterThanOrEqual(20);
  });

  it("has high parse confidence", () => {
    expect(r.metadata.parse_confidence).toBe("high");
  });

  it("has few issues (≤ 3)", () => {
    expect(r.issues.length).toBeLessThanOrEqual(3);
  });

  it("generates 3+ strengths", () => {
    expect(r.strengths.length).toBeGreaterThanOrEqual(3);
  });

  it("does NOT fire structure-missing rules", () => {
    const fired = ruleIds(r);
    expect(fired).not.toContain("STRUCT_001");
    expect(fired).not.toContain("STRUCT_002");
    expect(fired).not.toContain("STRUCT_003");
  });

  it("does NOT fire missing-dates rule", () => {
    expect(ruleIds(r)).not.toContain("STRUCT_006");
  });

  it("all subscores are 70+", () => {
    for (const s of r.subscores) {
      expect(s.raw_score).toBeGreaterThanOrEqual(70);
    }
  });
});

// ---------------------------------------------------------------------------
// Fixture 2: Weak resume (career changer, soft skills, weak verbs)
// ---------------------------------------------------------------------------

const WEAK = `
Mike Torres
mike.torres@email.com

SUMMARY
Former teacher transitioning to software development. Completed coding bootcamp.

EXPERIENCE
Teaching Fellow — CodeAcademy Bootcamp
Sep 2024 – Dec 2024
• Helped students with JavaScript basics
• Assisted with grading weekly assignments

High School Math Teacher — Lincoln High
Aug 2018 – Jun 2024
• Responsible for teaching algebra and calculus to 30 students
• Worked on curriculum development materials
• Participated in faculty meetings and planning sessions
• Assisted the department with exam scheduling

EDUCATION
CodeAcademy Full-Stack Bootcamp
Certificate in Full-Stack Development
2024

University of Texas
B.A. Mathematics
2014 – 2018

SKILLS
JavaScript, React, Node.js, HTML, CSS
`;

describe("integration — weak resume", () => {
  const r = runResumeOnlyAnalysisFromText(WEAK);

  it("produces valid result", () => assertValid(r));

  it("scores between 40 and 80", () => {
    expect(r.overall_score).toBeGreaterThanOrEqual(40);
    expect(r.overall_score).toBeLessThanOrEqual(80);
  });

  it("scores lower than the strong resume", () => {
    const strong = runResumeOnlyAnalysisFromText(STRONG);
    expect(r.overall_score).toBeLessThan(strong.overall_score);
  });

  it("fires CONTENT_002 (weak verbs: helped, assisted, worked, participated)", () => {
    expect(ruleIds(r)).toContain("CONTENT_002");
  });

  it("fires CONTENT_001 (low quantification)", () => {
    expect(ruleIds(r)).toContain("CONTENT_001");
  });

  it("fires PARSE_005 (no phone)", () => {
    expect(ruleIds(r)).toContain("PARSE_005");
  });

  it("fires PARSE_009 (no LinkedIn/GitHub)", () => {
    expect(ruleIds(r)).toContain("PARSE_009");
  });

  it("content_quality subscore is lower than structure", () => {
    expect(sub(r, "content_quality").raw_score).toBeLessThan(sub(r, "structure").raw_score);
  });

  it("parses 2 experience entries correctly", () => {
    expect(r.parsed_resume.experience).toHaveLength(2);
    expect(r.parsed_resume.experience[0].company).toContain("CodeAcademy");
    expect(r.parsed_resume.experience[1].company).toContain("Lincoln");
  });

  it("generates priority fixes with suggestions", () => {
    expect(r.priority_fixes.length).toBeGreaterThan(0);
    for (const fix of r.priority_fixes) {
      expect(fix.suggestion).toBeTruthy();
      expect(fix.target_section).toBeTruthy();
      expect(fix.weighted_lift).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Fixture 3: Paragraph-style resume (no bullet markers)
// ---------------------------------------------------------------------------

const PARAGRAPH = `
Tom Davis
tom@email.com
555-333-4444
linkedin.com/in/tomdavis

SUMMARY
Backend developer with 3 years of experience building production services.

EXPERIENCE
Backend Developer at TechCo
Jan 2022 – Present
Developed REST APIs serving mobile and web clients with Node.js and Express. Managed PostgreSQL databases and implemented caching with Redis. Collaborated with frontend team on API contracts and data models. Built automated testing framework covering 80% of critical paths.

Junior Developer at StartupX
Jun 2020 – Dec 2021
Built internal tools for operations team using Python and Django. Automated reporting workflows saving 10 hours per week. Implemented monitoring dashboards with Grafana and Prometheus.

EDUCATION
State University
B.S. Computer Science
2016 – 2020

SKILLS
Node.js, Express, PostgreSQL, Redis, Docker, AWS, Python, Git
`;

describe("integration — paragraph-style resume", () => {
  const r = runResumeOnlyAnalysisFromText(PARAGRAPH);

  it("produces valid result", () => assertValid(r));

  it("extracts bullets via paragraph fallback (not zero)", () => {
    const total = r.parsed_resume.experience.reduce((s, e) => s + e.bullets.length, 0);
    expect(total).toBeGreaterThanOrEqual(4);
  });

  it("sets paragraph_to_bullet_fallback flag", () => {
    expect(r.parsed_resume.parse_metadata.fallbacks_used.paragraph_to_bullet_fallback).toBe(true);
  });

  it("does NOT fire STRUCT_007 (no bullets)", () => {
    expect(ruleIds(r)).not.toContain("STRUCT_007");
  });

  it("does NOT fire CONTENT_006 (too few bullets) when enough sentences extracted", () => {
    const total = r.parsed_resume.experience.reduce((s, e) => s + e.bullets.length, 0);
    if (total >= 6) {
      expect(ruleIds(r)).not.toContain("CONTENT_006");
    }
  });

  it("does NOT fire zero-bullet penalty floor", () => {
    // Paragraphs were split into bullets, so CONTENT_003 should NOT fire via floor path
    const total = r.parsed_resume.experience.reduce((s, e) => s + e.bullets.length, 0);
    if (total > 0) {
      // If bullets were extracted, the floor should not apply
      const content003 = r.issues.find((i) => i.ruleId === "CONTENT_003");
      if (content003) {
        // If it fired, it should be because of no action verbs, not the floor message
        expect(content003.message).not.toContain("No structured bullet content");
      }
    }
  });

  it("scores 60+ (content exists, just not bulleted)", () => {
    expect(r.overall_score).toBeGreaterThanOrEqual(60);
  });

  it("parses both experience entries with company names", () => {
    expect(r.parsed_resume.experience).toHaveLength(2);
    expect(r.parsed_resume.experience[0].company).toBeTruthy();
    expect(r.parsed_resume.experience[1].company).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Fixture 4: Multi-line education with mixed date formats
// ---------------------------------------------------------------------------

const MULTI_EDU = `
Priya Sharma
priya@email.com
555-111-2222
linkedin.com/in/priya

SUMMARY
Software engineer with experience across cloud platforms and data systems.

EXPERIENCE
Software Engineer
Microsoft
08/2022 – Present
• Built Azure DevOps pipeline features for enterprise clients.
• Reduced build times by 40% through parallelized test execution.
• Implemented automated security scanning in CI/CD workflows.

Intern
Google
05/2022 – 08/2022
• Developed internal SRE tooling for monitoring service health.
• Built dashboards tracking latency across 200+ microservices.

Research Assistant
Stanford University
2020 – 2022
• Published 2 papers on distributed consensus algorithms.
• Implemented Raft protocol variant in Go for evaluation.

EDUCATION
Stanford University
M.S. Computer Science
09/2020 – 06/2022

IIT Delhi
B.Tech Computer Science
2016 – 2020

SKILLS
C++, Python, Java, Go, Docker, Kubernetes, Azure, Terraform, Git
`;

describe("integration — multi-line education + mixed dates", () => {
  const r = runResumeOnlyAnalysisFromText(MULTI_EDU);

  it("produces valid result", () => assertValid(r));

  it("parses 3 experience entries", () => {
    expect(r.parsed_resume.experience).toHaveLength(3);
  });

  it("detects company from line-2 fallback (Microsoft, Google, Stanford)", () => {
    const companies = r.parsed_resume.experience.map((e) => e.company);
    expect(companies[0]).toContain("Microsoft");
    expect(companies[1]).toContain("Google");
  });

  it("sets experience_header_fallback flag", () => {
    expect(r.parsed_resume.parse_metadata.fallbacks_used.experience_header_fallback).toBe(true);
  });

  it("parses MM/YYYY dates (08/2022)", () => {
    expect(r.parsed_resume.experience[0].start_date).toBe("08/2022");
    expect(r.parsed_resume.experience[0].is_current).toBe(true);
  });

  it("parses MM/YYYY date range (05/2022 – 08/2022)", () => {
    expect(r.parsed_resume.experience[1].start_date).toBe("05/2022");
    expect(r.parsed_resume.experience[1].end_date).toBe("08/2022");
  });

  it("parses year-only date range (2020 – 2022)", () => {
    expect(r.parsed_resume.experience[2].start_date).toBe("2020");
    expect(r.parsed_resume.experience[2].end_date).toBe("2022");
  });

  it("does NOT fire STRUCT_006 (missing dates) — all entries have dates", () => {
    expect(ruleIds(r)).not.toContain("STRUCT_006");
  });

  it("parses 2 education entries", () => {
    expect(r.parsed_resume.education).toHaveLength(2);
    expect(r.parsed_resume.education[0].institution).toContain("Stanford");
    expect(r.parsed_resume.education[1].institution).toContain("IIT");
  });

  it("parses education MM/YYYY dates", () => {
    expect(r.parsed_resume.education[0].start_date).toBe("09/2020");
    expect(r.parsed_resume.education[0].end_date).toBe("06/2022");
  });

  it("parses education year-only dates", () => {
    expect(r.parsed_resume.education[1].start_date).toBe("2016");
    expect(r.parsed_resume.education[1].end_date).toBe("2020");
  });

  it("scores 75+ (solid resume with all sections)", () => {
    expect(r.overall_score).toBeGreaterThanOrEqual(75);
  });

  it("all subscores have positive weighted contribution", () => {
    for (const s of r.subscores) {
      expect(s.weighted_score).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Cross-fixture comparisons
// ---------------------------------------------------------------------------

describe("integration — cross-fixture score ordering", () => {
  const strong = runResumeOnlyAnalysisFromText(STRONG);
  const multiEdu = runResumeOnlyAnalysisFromText(MULTI_EDU);
  const paragraph = runResumeOnlyAnalysisFromText(PARAGRAPH);
  const weak = runResumeOnlyAnalysisFromText(WEAK);

  it("strong and multi-edu both score 85+ (top tier)", () => {
    expect(strong.overall_score).toBeGreaterThanOrEqual(85);
    expect(multiEdu.overall_score).toBeGreaterThanOrEqual(85);
  });

  it("paragraph scores above weak", () => {
    expect(paragraph.overall_score).toBeGreaterThan(weak.overall_score);
  });

  it("weak scores lowest of all four", () => {
    expect(weak.overall_score).toBeLessThanOrEqual(strong.overall_score);
    expect(weak.overall_score).toBeLessThanOrEqual(multiEdu.overall_score);
    expect(weak.overall_score).toBeLessThanOrEqual(paragraph.overall_score);
  });

  it("weak has more issues than strong", () => {
    expect(weak.issues.length).toBeGreaterThan(strong.issues.length);
  });

  it("all four produce valid results", () => {
    assertValid(strong);
    assertValid(multiEdu);
    assertValid(paragraph);
    assertValid(weak);
  });
});
