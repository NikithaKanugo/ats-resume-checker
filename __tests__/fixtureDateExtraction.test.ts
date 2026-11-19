/**
 * Fixture-based tests: date extraction from experience headers across
 * all supported formats (Mon YYYY, MM/YYYY, MM/YY, YYYY, month-only, Present/Current).
 */
import { describe, it, expect } from "vitest";
import { buildResumeFromText } from "../lib/parsing/parseResume";

function firstEntry(headerAndDate: string) {
  const text = `
Name
email@test.com

EXPERIENCE
${headerAndDate}
• Built things.

EDUCATION
Uni
BS
2018

SKILLS
Python
`;
  return buildResumeFromText(text, "txt").experience[0];
}

// ---------------------------------------------------------------------------
// Month name + 4-digit year
// ---------------------------------------------------------------------------

describe("date extraction — Mon YYYY format", () => {
  it("Jan 2020 – Dec 2023", () => {
    const e = firstEntry("Dev — Co\nJan 2020 – Dec 2023");
    expect(e.start_date).toBe("Jan 2020");
    expect(e.end_date).toBe("Dec 2023");
    expect(e.is_current).toBe(false);
  });

  it("March 2022 - Present (full month name, regular hyphen)", () => {
    const e = firstEntry("Dev — Co\nMarch 2022 - Present");
    expect(e.start_date).toContain("March");
    expect(e.start_date).toContain("2022");
    expect(e.is_current).toBe(true);
    expect(e.end_date).toBeNull();
  });

  it("Sep 2014 – Jun 2016 (abbreviated months)", () => {
    const e = firstEntry("Dev — Co\nSep 2014 – Jun 2016");
    expect(e.start_date).toBe("Sep 2014");
    expect(e.end_date).toBe("Jun 2016");
  });

  it("handles dates on the same line as title", () => {
    const e = firstEntry("Software Engineer, Airbnb Jun 2020 – Feb 2022");
    expect(e.start_date).toBe("Jun 2020");
    expect(e.end_date).toBe("Feb 2022");
  });
});

// ---------------------------------------------------------------------------
// MM/YYYY format
// ---------------------------------------------------------------------------

describe("date extraction — MM/YYYY format", () => {
  it("08/2022 – 03/2025", () => {
    const e = firstEntry("Dev — Co\n08/2022 – 03/2025");
    expect(e.start_date).toBe("08/2022");
    expect(e.end_date).toBe("03/2025");
  });

  it("05/2020 – 08/2020 (short internship)", () => {
    const e = firstEntry("Intern — Co\n05/2020 – 08/2020");
    expect(e.start_date).toBe("05/2020");
    expect(e.end_date).toBe("08/2020");
  });

  it("08/2025 – Present", () => {
    const e = firstEntry("Dev — Co\n08/2025 – Present");
    expect(e.start_date).toBe("08/2025");
    expect(e.is_current).toBe(true);
  });

  it("1/2020 – 12/2023 (single digit month)", () => {
    const e = firstEntry("Dev — Co\n1/2020 – 12/2023");
    expect(e.start_date).toBe("1/2020");
    expect(e.end_date).toBe("12/2023");
  });
});

// ---------------------------------------------------------------------------
// MM/YY (two-digit year)
// ---------------------------------------------------------------------------

describe("date extraction — MM/YY format", () => {
  it("01/23 – 12/24", () => {
    const e = firstEntry("Dev — Co\n01/23 – 12/24");
    expect(e.start_date).toBe("01/23");
    expect(e.end_date).toBe("12/24");
  });

  it("03/22 – 11/24", () => {
    const e = firstEntry("Dev — Co\n03/22 – 11/24");
    expect(e.start_date).toBe("03/22");
    expect(e.end_date).toBe("11/24");
  });
});

// ---------------------------------------------------------------------------
// Year-only
// ---------------------------------------------------------------------------

describe("date extraction — year-only format", () => {
  it("2020 – 2023", () => {
    const e = firstEntry("Dev — Co\n2020 – 2023");
    expect(e.start_date).toBe("2020");
    expect(e.end_date).toBe("2023");
  });

  it("2022 – Present", () => {
    const e = firstEntry("Dev — Co\n2022 – Present");
    expect(e.start_date).toBe("2022");
    expect(e.is_current).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Month-only (no year)
// ---------------------------------------------------------------------------

describe("date extraction — month-only format", () => {
  it("Jan – Mar (no year)", () => {
    const e = firstEntry("Contractor — Agency\nJan – Mar");
    expect(e.start_date).not.toBeNull();
    expect(e.end_date).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Present / Current / Now variants
// ---------------------------------------------------------------------------

describe("date extraction — end-date variants", () => {
  it("Present (capitalized)", () => {
    const e = firstEntry("Dev — Co\nJan 2022 – Present");
    expect(e.is_current).toBe(true);
    expect(e.end_date).toBeNull();
  });

  it("present (lowercase)", () => {
    const e = firstEntry("Dev — Co\nJan 2022 – present");
    expect(e.is_current).toBe(true);
  });

  it("Current", () => {
    const e = firstEntry("Dev — Co\nJan 2020 – Current");
    expect(e.is_current).toBe(true);
  });

  it("Now", () => {
    const e = firstEntry("Dev — Co\nJan 2020 – Now");
    expect(e.is_current).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Dates on standalone lines (after title/company)
// ---------------------------------------------------------------------------

describe("date extraction — standalone date lines", () => {
  it("date on its own line below title and company", () => {
    const text = `
Name
email@test.com

EXPERIENCE
Software Engineer
Acme Corp
08/2023 – Present
New York, NY
• Designed API gateway.

EDUCATION
Uni
BS
2018

SKILLS
Python
`;
    const e = buildResumeFromText(text, "txt").experience[0];
    expect(e.start_date).toBe("08/2023");
    expect(e.is_current).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mixed date formats in one resume
// ---------------------------------------------------------------------------

describe("date extraction — mixed formats in single resume", () => {
  it("handles Mon YYYY, MM/YYYY, and YYYY in the same resume", () => {
    const text = `
Name
email@test.com

EXPERIENCE
Staff Engineer — Stripe
March 2022 – Present
• Built systems.

Intern — Google
05/2020 – 08/2020
• Developed tools.

Research Assistant — Lab
2018 – 2020
• Published papers.

EDUCATION
Stanford
M.S. CS
09/2020 – 06/2022

MIT
B.S. CS
2014 – 2018

SKILLS
Python, Go, Java
`;
    const r = buildResumeFromText(text, "txt");

    expect(r.experience[0].start_date).toContain("March");
    expect(r.experience[0].is_current).toBe(true);

    expect(r.experience[1].start_date).toBe("05/2020");
    expect(r.experience[1].end_date).toBe("08/2020");

    expect(r.experience[2].start_date).toBe("2018");
    expect(r.experience[2].end_date).toBe("2020");

    expect(r.education[0].start_date).toBe("09/2020");
    expect(r.education[1].start_date).toBe("2014");
  });
});
