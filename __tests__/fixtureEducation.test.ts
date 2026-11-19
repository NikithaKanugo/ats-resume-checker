/**
 * Fixture-based tests: education block parsing — multi-line entries,
 * varied date formats, degree extraction, and edge cases.
 */
import { describe, it, expect } from "vitest";
import { buildResumeFromText } from "../lib/parsing/parseResume";

function edu(educationBlock: string) {
  const text = `
Name
email@test.com

EXPERIENCE
Dev — Co
2020 – 2023
• Built things.

EDUCATION
${educationBlock}

SKILLS
Python
`;
  return buildResumeFromText(text, "txt").education;
}

// ---------------------------------------------------------------------------
// Basic multi-line entries
// ---------------------------------------------------------------------------

describe("education parsing — multi-line entries", () => {
  it("parses institution + degree on separate lines", () => {
    const entries = edu("MIT\nB.S. Computer Science\n2016 – 2020");
    expect(entries).toHaveLength(1);
    expect(entries[0].institution).toContain("MIT");
    expect(entries[0].degree).toContain("B.S.");
  });

  it("parses two entries separated by blank lines", () => {
    const entries = edu(
      "Stanford University\nM.S. Computer Science\n2020 – 2022\n\nUCLA\nB.S. Statistics\n2016 – 2020"
    );
    expect(entries).toHaveLength(2);
    expect(entries[0].institution).toContain("Stanford");
    expect(entries[1].institution).toContain("UCLA");
  });

  it("extracts dates from education entry", () => {
    const entries = edu("MIT\nM.S. CS\nSep 2014 – Jun 2016");
    expect(entries[0].start_date).toBe("Sep 2014");
    expect(entries[0].end_date).toBe("Jun 2016");
  });

  it("handles MM/YYYY dates in education", () => {
    const entries = edu("Stanford\nM.S. CS\n09/2020 – 06/2022");
    expect(entries[0].start_date).toBe("09/2020");
    expect(entries[0].end_date).toBe("06/2022");
  });

  it("handles year-only dates in education", () => {
    const entries = edu("State University\nB.S. CS\n2016 – 2020");
    expect(entries[0].start_date).toBe("2016");
    expect(entries[0].end_date).toBe("2020");
  });
});

// ---------------------------------------------------------------------------
// Degree extraction
// ---------------------------------------------------------------------------

describe("education parsing — degree formats", () => {
  it("extracts field of study from 'B.S. Computer Science'", () => {
    const entries = edu("MIT\nB.S. Computer Science\n2016 – 2020");
    expect(entries[0].field_of_study).toContain("Computer Science");
  });

  it("extracts field of study from 'M.S. in Data Science'", () => {
    const entries = edu("Stanford\nM.S. in Data Science\n2020 – 2022");
    expect(entries[0].field_of_study).toContain("Data Science");
  });

  it("handles Bachelor's with apostrophe", () => {
    const entries = edu("State University\nBachelor's in CS\n2016 – 2020");
    // degree field should be populated even if field_of_study extraction fails
    expect(entries[0].degree).toContain("Bachelor");
  });

  it("extracts GPA when present", () => {
    const entries = edu("MIT\nB.S. Computer Science\nGPA: 3.9\n2016 – 2020");
    expect(entries[0].gpa).toBe("3.9");
  });

  it("GPA is null when not present", () => {
    const entries = edu("MIT\nB.S. CS\n2016 – 2020");
    expect(entries[0].gpa).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("education parsing — edge cases", () => {
  it("handles single-line education (just institution)", () => {
    const entries = edu("MIT");
    expect(entries).toHaveLength(1);
    expect(entries[0].institution).toContain("MIT");
    expect(entries[0].degree).toBeNull();
  });

  it("handles bootcamp-style entry (no degree)", () => {
    const entries = edu(
      "CodeAcademy Full-Stack Bootcamp\nCertificate in Full-Stack Development\n2024"
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].institution).toContain("CodeAcademy");
    expect(entries[0].degree).toContain("Certificate");
  });

  it("handles empty education block", () => {
    const entries = edu("");
    expect(entries).toHaveLength(0);
  });

  it("handles three education entries", () => {
    const entries = edu(
      "Stanford\nPh.D. CS\n2022 – 2026\n\nMIT\nM.S. CS\n2020 – 2022\n\nUCLA\nB.S. CS\n2016 – 2020"
    );
    expect(entries).toHaveLength(3);
    expect(entries[0].institution).toContain("Stanford");
    expect(entries[1].institution).toContain("MIT");
    expect(entries[2].institution).toContain("UCLA");
  });

  it("comma-style education line: Institution, Degree, Year", () => {
    // Some resumes put everything on one line
    const entries = edu("MIT, M.S. Data Science, 2021");
    expect(entries).toHaveLength(1);
    expect(entries[0].institution).toBeTruthy();
  });
});
