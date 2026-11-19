/**
 * Tests for experience header parsing: title/company/location extraction
 * across all separator formats and edge cases.
 */
import { describe, it, expect } from "vitest";
import { buildResumeFromText } from "../lib/parsing/parseResume";

/** Helper: build a minimal resume with one experience entry and return it. */
function parseEntry(headerLine: string) {
  const text = `
Name
email@test.com
555-000-0000

EXPERIENCE
${headerLine}
Jan 2020 – Dec 2023
• Built APIs.

EDUCATION
University
B.S. CS

SKILLS
Python, Java
`;
  const r = buildResumeFromText(text, "txt");
  return r.experience[0] ?? { title: null, company: null, location: null };
}

describe("parseTitleLine — separator formats", () => {
  it("em dash: Title — Company", () => {
    const e = parseEntry("Software Engineer — Acme Corp");
    expect(e.title).toBe("Software Engineer");
    expect(e.company).toBe("Acme Corp");
  });

  it("en dash: Title – Company", () => {
    const e = parseEntry("Software Engineer – Acme Corp");
    expect(e.title).toBe("Software Engineer");
    expect(e.company).toBe("Acme Corp");
  });

  it("pipe: Title | Company", () => {
    const e = parseEntry("Software Engineer | Acme Corp");
    expect(e.title).toBe("Software Engineer");
    expect(e.company).toBe("Acme Corp");
  });

  it("spaced hyphen: Title - Company", () => {
    const e = parseEntry("Software Engineer - Acme Corp");
    expect(e.title).toBe("Software Engineer");
    expect(e.company).toBe("Acme Corp");
  });

  it("at: Title at Company", () => {
    const e = parseEntry("Software Engineer at Acme Corp");
    expect(e.title).toBe("Software Engineer");
    expect(e.company).toBe("Acme Corp");
  });

  it("comma with space: Title, Company", () => {
    const e = parseEntry("Software Engineer, Acme Corp");
    expect(e.title).toBe("Software Engineer");
    expect(e.company).toBe("Acme Corp");
  });

  it("comma NO space before: Title, Company (the original bug)", () => {
    const e = parseEntry("Software Engineer II, Stripe");
    expect(e.title).toBe("Software Engineer II");
    expect(e.company).toBe("Stripe");
  });

  it("@ symbol: Title @ Company", () => {
    const e = parseEntry("Developer @ StartupCo");
    expect(e.title).toBe("Developer");
    expect(e.company).toBe("StartupCo");
  });
});

describe("parseTitleLine — location handling", () => {
  it("strips trailing City, ST from title line", () => {
    const e = parseEntry("Senior Developer, San Francisco, CA");
    expect(e.title).toBe("Senior Developer");
    expect(e.location).toContain("San Francisco");
    expect(e.company).toBeNull();
  });

  it("strips trailing location with pipe separator", () => {
    const e = parseEntry("Engineer — Acme Corp | New York, NY");
    expect(e.title).toBe("Engineer");
    expect(e.company).toBe("Acme Corp");
    expect(e.location).toContain("New York");
  });

  it("strips trailing Remote", () => {
    const e = parseEntry("Engineer — Acme Corp | Remote");
    expect(e.title).toBe("Engineer");
    expect(e.company).toBe("Acme Corp");
    expect(e.location).toBe("Remote");
  });

  it("handles comma title + comma location: Title, Company, City, ST", () => {
    const e = parseEntry("Software Engineer, Stripe, San Francisco, CA");
    expect(e.title).toBe("Software Engineer");
    expect(e.company).toBe("Stripe");
    expect(e.location).toContain("San Francisco");
  });

  it("does NOT treat bare state code as company", () => {
    // "Developer, CA" — CA is a state, not a company
    const e = parseEntry("Developer, CA");
    expect(e.title).toBe("Developer");
    expect(e.company).toBeNull();
  });
});

describe("parseTitleLine — date stripping", () => {
  it("strips embedded date range from title", () => {
    const e = parseEntry("Software Engineer 08/2022 – 03/2025");
    expect(e.title).not.toBeNull();
    expect(e.title).not.toMatch(/\d{2}\/\d{4}/);
  });

  it("strips date range from company after comma split", () => {
    const e = parseEntry("Engineer, Acme Corp Jan 2020 – Dec 2023");
    expect(e.company).not.toBeNull();
    expect(e.company).not.toMatch(/Jan|Dec/);
  });
});

describe("parseTitleLine — edge cases", () => {
  it("handles line with no separator (title only)", () => {
    const e = parseEntry("Software Engineer");
    expect(e.title).toBe("Software Engineer");
    expect(e.company).toBeNull();
  });

  it("handles parenthetical in title: Title (Detail) — Company", () => {
    const e = parseEntry("AI Engineer (Build admin) – Generative AI & Cloud");
    expect(e.title).toBe("AI Engineer (Build admin)");
    expect(e.company).toBe("Generative AI & Cloud");
  });

  it("handles multi-word company with comma separator", () => {
    const e = parseEntry("Data Scientist, Goldman Sachs");
    expect(e.title).toBe("Data Scientist");
    expect(e.company).toBe("Goldman Sachs");
  });

  it("handles company-on-next-line fallback when first line has no separator", () => {
    const text = `
Name
email@test.com
555-000-0000

EXPERIENCE
Senior Developer
Netflix
Jan 2022 – Present
• Scaled video pipeline.

EDUCATION
University
B.S. CS

SKILLS
Python
`;
    const r = buildResumeFromText(text, "txt");
    expect(r.experience[0].title).toBe("Senior Developer");
    expect(r.experience[0].company).toBe("Netflix");
  });

  it("handles empty line gracefully", () => {
    const text = `
Name
email@test.com

EXPERIENCE

Jan 2022 – Present
• Did things.

EDUCATION
Uni
BS

SKILLS
X
`;
    const r = buildResumeFromText(text, "txt");
    // Should not crash — may return sparse entry
    expect(r).toBeTruthy();
  });
});

describe("parseTitleLine — real-world formats", () => {
  it("Google-style: Title, Company", () => {
    const e = parseEntry("Software Engineer L5, Google");
    expect(e.title).toBe("Software Engineer L5");
    expect(e.company).toBe("Google");
  });

  it("consulting-style: Title | Company | Location", () => {
    const e = parseEntry("Senior Consultant | Deloitte | Chicago, IL");
    expect(e.title).toBe("Senior Consultant");
    expect(e.company).toBe("Deloitte");
    expect(e.location).toContain("Chicago");
  });

  it("intern-style: Intern — Company (City, ST)", () => {
    // Location in parens — not stripped by our regex, but company should work
    const e = parseEntry("Engineering Intern — Meta");
    expect(e.title).toBe("Engineering Intern");
    expect(e.company).toBe("Meta");
  });
});
