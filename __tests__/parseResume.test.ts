/**
 * Unit tests for the resume parser: contact extraction, experience segmentation,
 * date parsing, education, skills, and malformed input resilience.
 */
import { describe, it, expect } from "vitest";
import { buildResumeFromText } from "../lib/parsing/parseResume";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Standard resume with clear formatting. */
const STANDARD = `
Jane Doe
jane@example.com
555-123-4567
New York, NY
linkedin.com/in/janedoe
github.com/janedoe

SUMMARY
Senior software engineer with 6 years of experience.

EXPERIENCE
Senior Software Engineer — Acme Corp
Jan 2021 – Present
• Led migration to microservices, reducing deploy time by 60%.
• Built REST APIs handling 10K requests/sec.
• Mentored 3 junior engineers.

Software Developer — Startup Inc
Jun 2018 – Dec 2020
• Developed React frontend serving 5K DAU.
• Reduced page load by 40%.
• Wrote integration tests covering 85% of flows.

EDUCATION
MIT
B.S. Computer Science
Sep 2014 – May 2018

SKILLS
Languages: TypeScript, Python, Go
Frameworks: React, Node.js, FastAPI
Cloud: AWS, Docker, Kubernetes
`;

/** Resume with MM/YYYY date format. */
const NUMERIC_DATES = `
John Smith
john@test.com
123-456-7890

EXPERIENCE
Backend Engineer
Google
08/2022 – 03/2025
• Built distributed cache layer.

Data Analyst
Startup
01/2020 – 07/2022
• Analysed customer data pipelines.

EDUCATION
Stanford University
M.S. Computer Science
09/2018 – 06/2020

SKILLS
Python, SQL, Spark, Kafka
`;

/** Resume with MM/YY (two-digit year) dates. */
const SHORT_YEAR_DATES = `
Alice Brown
alice@email.com
987-654-3210

EXPERIENCE
Frontend Dev — WebCo
03/22 – 11/24
• Built React components.

EDUCATION
State University
B.S. in IT
08/18 – 05/22

SKILLS
React, TypeScript, CSS
`;

/** Resume with company on separate line (no separator in title). */
const COMPANY_ON_NEXT_LINE = `
Bob Johnson
bob@email.com
555-999-0000

EXPERIENCE
Senior Developer
Netflix
Jan 2022 – Present
• Scaled video encoding pipeline.
• Reduced latency by 35%.

Junior Developer
Amazon
Jun 2019 – Dec 2021
• Built internal tooling.

EDUCATION
UC Berkeley
B.A. Computer Science
2015 – 2019

SKILLS
Java, Python, AWS, Terraform
`;

/** Resume with no section headers at all. */
const NO_HEADERS = `
Sam Wilson
sam@email.com
555-111-2222
Software engineer with 3 years experience in web development.
Built REST APIs using Node.js and Express.
Deployed applications on AWS using Docker and Kubernetes.
`;

/** Resume with only a name and email — extremely sparse. */
const ULTRA_SPARSE = `
Only Name
only@email.com
`;

/** Garbage / non-resume text. */
const GARBAGE = `
!!!! @@@@ #### $$$$
{{{{{ }}}}} [[[[[ ]]]]]
~~~~ ^^^^ &&&& ****
`;

/** Resume where dates are on standalone lines after bullets. */
const DATES_AFTER_BULLETS = `
Chris Lee
chris@test.com
555-000-1111

EXPERIENCE
Software Engineer
Acme Corp
• Designed API gateway handling 5K RPS.
• Implemented OAuth2 flow.
08/2023 – Present
New York, NY

EDUCATION
NYU
M.S. Data Science
2021 – 2023

SKILLS
Go, Rust, PostgreSQL
`;

/** Resume with year-only date ranges. */
const YEAR_ONLY_DATES = `
Dana Kim
dana@email.com
555-222-3333

EXPERIENCE
Engineer — TechCorp
2021 – 2024
• Built microservices architecture.
• Led team of 4 engineers.

Intern — StartupX
2020 – 2021
• Developed internal dashboard.

EDUCATION
MIT
B.S. CS
2016 – 2020

SKILLS
Python, Java, Docker
`;

/** Resume with month-name-only ranges (no year). */
const MONTH_ONLY_DATES = `
Eve Park
eve@email.com
555-444-5555

EXPERIENCE
Contract Developer — Agency
Jan – Mar
• Built landing pages.

EDUCATION
Community College
A.S. Web Dev

SKILLS
HTML, CSS, JavaScript
`;

/** Resume with Present/Current as end date variants. */
const PRESENT_VARIANTS = `
Frank Green
frank@email.com
555-666-7777

EXPERIENCE
Lead Engineer — BigCo
Mar 2023 – present
• Architected platform services.

Staff Engineer — MidCo
Jan 2020 – Current
• Built CI/CD pipeline.

EDUCATION
Georgia Tech
M.S. CS
2018 – 2020

SKILLS
TypeScript, React, AWS
`;

/** Resume with categorized skills format. */
const CATEGORIZED_SKILLS = `
Grace Hall
grace@email.com
555-888-9999

SUMMARY
Full-stack developer with 4 years of experience.

EXPERIENCE
Developer — Corp
2021 – Present
• Built APIs and frontend components.
• Managed database migrations.
• Reduced error rate by 50%.

EDUCATION
UCLA
B.S. Computer Science
2017 – 2021

SKILLS
Languages: TypeScript, Python, Go, Rust
Frameworks: React, Next.js, Django, FastAPI
Databases: PostgreSQL, Redis, MongoDB
Cloud: AWS, GCP, Docker, Kubernetes
Tools: Git, GitHub Actions, Terraform, DataDog
`;

// ---------------------------------------------------------------------------
// Contact parsing
// ---------------------------------------------------------------------------

describe("contact parsing", () => {
  it("extracts name, email, phone, location from standard resume", () => {
    const r = buildResumeFromText(STANDARD);
    expect(r.contact.name).toBe("Jane Doe");
    expect(r.contact.email).toBe("jane@example.com");
    expect(r.contact.phone).toBe("555-123-4567");
    expect(r.contact.location).toContain("New York");
  });

  it("extracts LinkedIn URL", () => {
    const r = buildResumeFromText(STANDARD);
    expect(r.contact.linkedin).toContain("linkedin.com/in/janedoe");
  });

  it("extracts GitHub URL", () => {
    const r = buildResumeFromText(STANDARD);
    expect(r.contact.github).toContain("github.com/janedoe");
  });

  it("returns null for missing LinkedIn when no URL or bare word present", () => {
    const r = buildResumeFromText(NUMERIC_DATES);
    expect(r.contact.linkedin).toBeNull();
  });

  it("handles resume with only name and email", () => {
    const r = buildResumeFromText(ULTRA_SPARSE);
    expect(r.contact.name).toBe("Only Name");
    expect(r.contact.email).toBe("only@email.com");
    expect(r.contact.phone).toBeNull();
  });

  it("returns null fields for garbage input", () => {
    const r = buildResumeFromText(GARBAGE);
    expect(r.contact.email).toBeNull();
    expect(r.contact.phone).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Date parsing — varied formats
// ---------------------------------------------------------------------------

describe("date parsing", () => {
  it("parses Mon YYYY – Mon YYYY (standard)", () => {
    const r = buildResumeFromText(STANDARD);
    const entry = r.experience[0];
    expect(entry.start_date).toBe("Jan 2021");
    expect(entry.is_current).toBe(true);
  });

  it("parses MM/YYYY – MM/YYYY (numeric)", () => {
    const r = buildResumeFromText(NUMERIC_DATES);
    const entry = r.experience[0];
    expect(entry.start_date).toBe("08/2022");
    expect(entry.end_date).toBe("03/2025");
  });

  it("parses MM/YY – MM/YY (two-digit year)", () => {
    const r = buildResumeFromText(SHORT_YEAR_DATES);
    const entry = r.experience[0];
    expect(entry.start_date).toBe("03/22");
    expect(entry.end_date).toBe("11/24");
  });

  it("parses YYYY – YYYY (year-only)", () => {
    const r = buildResumeFromText(YEAR_ONLY_DATES);
    const entry = r.experience[0];
    expect(entry.start_date).toBe("2021");
    expect(entry.end_date).toBe("2024");
  });

  it("parses month-only ranges (Jan – Mar)", () => {
    const r = buildResumeFromText(MONTH_ONLY_DATES);
    const entry = r.experience[0];
    expect(entry.start_date).not.toBeNull();
    expect(entry.end_date).not.toBeNull();
  });

  it("parses Present and Current as end date", () => {
    const r = buildResumeFromText(PRESENT_VARIANTS);
    expect(r.experience[0].is_current).toBe(true);
    expect(r.experience[1].is_current).toBe(true);
  });

  it("finds dates on standalone lines after bullets", () => {
    const r = buildResumeFromText(DATES_AFTER_BULLETS);
    const entry = r.experience[0];
    expect(entry.start_date).toBe("08/2023");
    expect(entry.is_current).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Experience segmentation
// ---------------------------------------------------------------------------

describe("experience segmentation", () => {
  it("detects correct number of entries in standard resume", () => {
    const r = buildResumeFromText(STANDARD);
    expect(r.experience.length).toBe(2);
  });

  it("detects company on separate line", () => {
    const r = buildResumeFromText(COMPANY_ON_NEXT_LINE);
    expect(r.experience.length).toBeGreaterThanOrEqual(2);
    expect(r.experience[0].company).toBeTruthy();
    expect(r.experience[0].company).toContain("Netflix");
  });

  it("extracts bullets correctly", () => {
    const r = buildResumeFromText(STANDARD);
    expect(r.experience[0].bullets.length).toBeGreaterThanOrEqual(2);
    expect(r.experience[0].bullets[0]).toContain("migration");
  });

  it("extracts title from separator format (Title — Company)", () => {
    const r = buildResumeFromText(STANDARD);
    expect(r.experience[0].title).toContain("Senior Software Engineer");
    expect(r.experience[0].company).toContain("Acme Corp");
  });

  it("returns empty experience for resume with no headers", () => {
    const r = buildResumeFromText(NO_HEADERS);
    // No experience section detected → empty array
    expect(r.experience).toHaveLength(0);
  });

  it("strips date ranges from title text", () => {
    const r = buildResumeFromText(NUMERIC_DATES);
    // Title should NOT contain "08/2022" etc
    for (const entry of r.experience) {
      if (entry.title) {
        expect(entry.title).not.toMatch(/\d{2}\/\d{4}/);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Education parsing
// ---------------------------------------------------------------------------

describe("education parsing", () => {
  it("parses institution and degree", () => {
    const r = buildResumeFromText(STANDARD);
    expect(r.education.length).toBeGreaterThanOrEqual(1);
    expect(r.education[0].institution).toContain("MIT");
  });

  it("parses education dates", () => {
    const r = buildResumeFromText(STANDARD);
    const edu = r.education[0];
    expect(edu.start_date || edu.end_date).toBeTruthy();
  });

  it("handles education with year-only dates", () => {
    const r = buildResumeFromText(YEAR_ONLY_DATES);
    const edu = r.education[0];
    expect(edu.start_date).toBe("2016");
    expect(edu.end_date).toBe("2020");
  });
});

// ---------------------------------------------------------------------------
// Skills parsing
// ---------------------------------------------------------------------------

describe("skills parsing", () => {
  it("parses flat comma-separated skills", () => {
    const r = buildResumeFromText(NUMERIC_DATES);
    expect(r.skills.raw_list).toContain("Python");
    expect(r.skills.raw_list).toContain("SQL");
  });

  it("parses categorized skills (Category: skill1, skill2)", () => {
    const r = buildResumeFromText(CATEGORIZED_SKILLS);
    expect(r.skills.raw_list.length).toBeGreaterThanOrEqual(10);
    expect(r.skills.raw_list).toContain("TypeScript");
    expect(r.skills.raw_list).toContain("PostgreSQL");
    expect(Object.keys(r.skills.categories).length).toBeGreaterThanOrEqual(3);
  });

  it("de-duplicates skills", () => {
    const r = buildResumeFromText(CATEGORIZED_SKILLS);
    const unique = new Set(r.skills.raw_list);
    expect(unique.size).toBe(r.skills.raw_list.length);
  });
});

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------

describe("parse confidence", () => {
  it("assigns high confidence to well-structured resume", () => {
    const r = buildResumeFromText(STANDARD);
    expect(r.parse_metadata.parse_confidence).toBe("high");
  });

  it("assigns low confidence to garbage input", () => {
    const r = buildResumeFromText(GARBAGE);
    expect(r.parse_metadata.parse_confidence).toBe("low");
  });

  it("assigns low confidence to no-headers resume", () => {
    const r = buildResumeFromText(NO_HEADERS);
    expect(r.parse_metadata.parse_confidence).toBe("low");
  });

  it("assigns medium or high confidence to minimal but structured resume", () => {
    const r = buildResumeFromText(MONTH_ONLY_DATES);
    expect(["medium", "high"]).toContain(r.parse_metadata.parse_confidence);
  });
});

// ---------------------------------------------------------------------------
// Malformed / edge-case resilience
// ---------------------------------------------------------------------------

describe("malformed input resilience", () => {
  it("handles empty string without crashing", () => {
    const r = buildResumeFromText("");
    expect(r.contact.name).toBeNull();
    expect(r.experience).toHaveLength(0);
    expect(r.education).toHaveLength(0);
  });

  it("handles string of only whitespace", () => {
    const r = buildResumeFromText("   \n\n\t\t  \n  ");
    expect(r.experience).toHaveLength(0);
  });

  it("handles garbage characters", () => {
    const r = buildResumeFromText(GARBAGE);
    expect(r.experience).toHaveLength(0);
    expect(r.education).toHaveLength(0);
    expect(r.skills.raw_list).toHaveLength(0);
  });

  it("handles extremely long single line without hanging", () => {
    const longLine = "a".repeat(50_000);
    const r = buildResumeFromText(longLine);
    expect(r.raw_text).toBe(longLine);
  });

  it("handles resume with all sections empty (only headers)", () => {
    const r = buildResumeFromText("EXPERIENCE\n\nEDUCATION\n\nSKILLS\n");
    expect(r.experience).toHaveLength(0);
    expect(r.education).toHaveLength(0);
    expect(r.skills.raw_list).toHaveLength(0);
  });

  it("detected sections list matches actual content", () => {
    const r = buildResumeFromText(STANDARD);
    expect(r.parse_metadata.detected_sections).toContain("experience");
    expect(r.parse_metadata.detected_sections).toContain("education");
    expect(r.parse_metadata.detected_sections).toContain("skills");
    expect(r.parse_metadata.detected_sections).toContain("summary");
  });
});
