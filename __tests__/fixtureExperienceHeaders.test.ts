/**
 * Fixture-based tests: experience header parsing across separator
 * variations and multi-line layouts.  Each fixture is a full resume
 * with explicit expected field values per entry.
 */
import { describe, it, expect } from "vitest";
import { buildResumeFromText } from "../lib/parsing/parseResume";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function exp(text: string) {
  return buildResumeFromText(text, "txt").experience;
}

function wrap(experienceBlock: string) {
  return `
Name
email@test.com
555-000-0000

EXPERIENCE
${experienceBlock}

EDUCATION
University
B.S. CS
2018

SKILLS
Python, Java
`;
}

// ---------------------------------------------------------------------------
// Separator variations
// ---------------------------------------------------------------------------

describe("experience headers — separator variations", () => {
  it("em dash: Title — Company", () => {
    const entries = exp(wrap(
      "Software Engineer — Acme Corp\nJan 2020 – Dec 2023\n• Built APIs."
    ));
    expect(entries[0].title).toBe("Software Engineer");
    expect(entries[0].company).toBe("Acme Corp");
  });

  it("en dash: Title – Company", () => {
    const entries = exp(wrap(
      "Software Engineer – Acme Corp\nJan 2020 – Dec 2023\n• Built APIs."
    ));
    expect(entries[0].title).toBe("Software Engineer");
    expect(entries[0].company).toBe("Acme Corp");
  });

  it("pipe: Title | Company", () => {
    const entries = exp(wrap(
      "Software Engineer | Acme Corp\nJan 2020 – Dec 2023\n• Built APIs."
    ));
    expect(entries[0].title).toBe("Software Engineer");
    expect(entries[0].company).toBe("Acme Corp");
  });

  it("spaced hyphen: Title - Company", () => {
    const entries = exp(wrap(
      "Software Engineer - Acme Corp\nJan 2020 – Dec 2023\n• Built APIs."
    ));
    expect(entries[0].title).toBe("Software Engineer");
    expect(entries[0].company).toBe("Acme Corp");
  });

  it("at keyword: Title at Company", () => {
    const entries = exp(wrap(
      "Software Engineer at Acme Corp\nJan 2020 – Dec 2023\n• Built APIs."
    ));
    expect(entries[0].title).toBe("Software Engineer");
    expect(entries[0].company).toBe("Acme Corp");
  });

  it("comma with space: Title, Company", () => {
    const entries = exp(wrap(
      "Data Analyst, Goldman Sachs\nJun 2021 – Dec 2022\n• Analyzed data."
    ));
    expect(entries[0].title).toBe("Data Analyst");
    expect(entries[0].company).toBe("Goldman Sachs");
  });

  it("comma without leading space: TitleX, Company", () => {
    const entries = exp(wrap(
      "Software Engineer II, Stripe\nJan 2023 – Present\n• Built systems."
    ));
    expect(entries[0].title).toBe("Software Engineer II");
    expect(entries[0].company).toBe("Stripe");
  });

  it("@ symbol: Title @ Company", () => {
    const entries = exp(wrap(
      "Developer @ StartupCo\n2022 – 2023\n• Shipped features."
    ));
    expect(entries[0].title).toBe("Developer");
    expect(entries[0].company).toBe("StartupCo");
  });
});

// ---------------------------------------------------------------------------
// Company on next line
// ---------------------------------------------------------------------------

describe("experience headers — company on next line", () => {
  it("detects company from line 2 when no separator on line 1", () => {
    const entries = exp(wrap(
      "Senior Developer\nNetflix\nJan 2022 – Present\n• Scaled pipeline."
    ));
    expect(entries[0].title).toBe("Senior Developer");
    expect(entries[0].company).toBe("Netflix");
  });

  it("does NOT treat a date line as company", () => {
    const entries = exp(wrap(
      "Developer\nJan 2022 – Present\n• Built APIs."
    ));
    expect(entries[0].title).toBe("Developer");
    // Company should be null — the date line is not a company name
    expect(entries[0].company).toBeNull();
  });

  it("does NOT treat a location-only line as company", () => {
    const entries = exp(wrap(
      "Developer\nNew York, NY\nJan 2022 – Present\n• Built APIs."
    ));
    expect(entries[0].title).toBe("Developer");
    // company should be null or not the location
    if (entries[0].company) {
      expect(entries[0].company).not.toContain("New York");
    }
  });

  it("sets fallback flag when company comes from line 2", () => {
    const r = buildResumeFromText(wrap(
      "Senior Developer\nNetflix\nJan 2022 – Present\n• Scaled pipeline."
    ), "txt");
    expect(r.parse_metadata.fallbacks_used.experience_header_fallback).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Title with location inline
// ---------------------------------------------------------------------------

describe("experience headers — inline location stripping", () => {
  it("pipe-separated: Title | Company | City, ST", () => {
    const entries = exp(wrap(
      "Senior Consultant | Deloitte | Chicago, IL\nMar 2022 – Present\n• Led migration."
    ));
    expect(entries[0].title).toBe("Senior Consultant");
    expect(entries[0].company).toBe("Deloitte");
    expect(entries[0].location).toContain("Chicago");
  });

  it("comma-separated: Title, Company, City, ST", () => {
    const entries = exp(wrap(
      "Software Engineer, Stripe, San Francisco, CA\nJun 2019 – Feb 2022\n• Built payments."
    ));
    expect(entries[0].title).toBe("Software Engineer");
    expect(entries[0].company).toBe("Stripe");
    expect(entries[0].location).toContain("San Francisco");
  });

  it("trailing Remote: Title — Company | Remote", () => {
    const entries = exp(wrap(
      "Engineer — Acme Corp | Remote\nJan 2023 – Present\n• Built services."
    ));
    expect(entries[0].title).toBe("Engineer");
    expect(entries[0].company).toBe("Acme Corp");
    expect(entries[0].location).toBe("Remote");
  });

  it("bare state code NOT treated as company: Title, CA", () => {
    const entries = exp(wrap(
      "Developer, CA\nJan 2022 – Present\n• Built things."
    ));
    expect(entries[0].title).toBe("Developer");
    expect(entries[0].company).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Parenthetical and complex titles
// ---------------------------------------------------------------------------

describe("experience headers — complex title formats", () => {
  it("parenthetical detail: Title (Detail) – Company", () => {
    const entries = exp(wrap(
      "AI Engineer (Build admin) – Generative AI & Cloud\n08/2025 – Present\n• Built agents."
    ));
    expect(entries[0].title).toBe("AI Engineer (Build admin)");
    expect(entries[0].company).toBe("Generative AI & Cloud");
  });

  it("level suffix: Engineer L5, Company", () => {
    const entries = exp(wrap(
      "Software Engineer L5, Google\nJan 2022 – Present\n• Designed systems."
    ));
    expect(entries[0].title).toBe("Software Engineer L5");
    expect(entries[0].company).toBe("Google");
  });

  it("embedded date stripped from title", () => {
    const entries = exp(wrap(
      "Software Engineer 08/2022 – 03/2025\n• Built APIs."
    ));
    expect(entries[0].title).not.toMatch(/\d{2}\/\d{4}/);
    expect(entries[0].start_date).toBe("08/2022");
  });
});

// ---------------------------------------------------------------------------
// Multiple entries in one resume
// ---------------------------------------------------------------------------

describe("experience headers — multiple entries", () => {
  it("parses 3 entries with mixed separator styles", () => {
    const entries = exp(wrap(`Staff Engineer — Stripe
Jan 2022 – Present
• Built payment systems.
• Led team of 6.

Software Engineer, Airbnb
Mar 2018 – Dec 2021
• Designed search ranking.
• Built A/B platform.

Developer at Dropbox
Jun 2016 – Feb 2018
• Developed file sync engine.`
    ));
    expect(entries).toHaveLength(3);
    expect(entries[0].company).toBe("Stripe");
    expect(entries[1].company).toBe("Airbnb");
    expect(entries[2].company).toBe("Dropbox");
    expect(entries[0].bullets).toHaveLength(2);
    expect(entries[1].bullets).toHaveLength(2);
    expect(entries[2].bullets).toHaveLength(1);
  });
});
