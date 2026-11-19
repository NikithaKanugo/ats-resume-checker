import { describe, it, expect } from "vitest";
import { buildResumeFromText } from "../lib/parsing/parseResume";

describe("parse trace: section_confidence", () => {
  it("all high for a well-structured resume", () => {
    const r = buildResumeFromText(`
Jane Doe
jane@email.com
555-000-0000

EXPERIENCE
Engineer — Acme Corp
Jan 2020 – Dec 2023
• Built APIs handling 10K requests/sec.
• Reduced latency by 40%.
• Implemented CI/CD pipeline.

EDUCATION
MIT
B.S. Computer Science
2016 – 2020

SKILLS
TypeScript, React, Node.js, Python, Docker, AWS, PostgreSQL, Git
`);
    expect(r.parse_metadata.section_confidence.contact).toBe("high");
    expect(r.parse_metadata.section_confidence.experience).toBe("high");
    expect(r.parse_metadata.section_confidence.education).toBe("high");
    expect(r.parse_metadata.section_confidence.skills).toBe("high");
  });

  it("low experience confidence when header detected but no entries", () => {
    const r = buildResumeFromText(`
Name
email@test.com

EXPERIENCE

EDUCATION
Uni
BS CS

SKILLS
Python
`);
    expect(r.parse_metadata.section_confidence.experience).toBe("low");
  });

  it("medium skills confidence when 1–4 skills detected", () => {
    const r = buildResumeFromText(`
Name
email@test.com

EXPERIENCE
Dev — Co
2020 – 2023
• Built things.

EDUCATION
Uni
BS

SKILLS
Python, SQL
`);
    expect(r.parse_metadata.section_confidence.skills).toBe("medium");
  });
});

describe("parse trace: fallbacks_used", () => {
  it("no fallbacks for a clean resume", () => {
    const r = buildResumeFromText(`
Jane Doe
jane@email.com
555-000-0000
linkedin.com/in/janedoe

EXPERIENCE
Engineer — Acme Corp
Jan 2020 – Dec 2023
• Built APIs.
• Wrote tests.
• Deployed services.

EDUCATION
MIT
B.S. CS
2016 – 2020

SKILLS
Python, Java, Docker
`);
    const fb = r.parse_metadata.fallbacks_used;
    expect(fb.experience_header_fallback).toBe(false);
    expect(fb.paragraph_to_bullet_fallback).toBe(false);
    expect(fb.linkedin_bare_word_fallback).toBe(false);
  });

  it("experience_header_fallback when company is on line 2", () => {
    const r = buildResumeFromText(`
Name
email@test.com

EXPERIENCE
Senior Developer
Netflix
Jan 2022 – Present
• Scaled pipeline.

EDUCATION
Uni
BS
2018

SKILLS
Python
`);
    expect(r.parse_metadata.fallbacks_used.experience_header_fallback).toBe(true);
    expect(r.experience[0].company).toContain("Netflix");
  });

  it("paragraph_to_bullet_fallback when no bullet markers present", () => {
    const r = buildResumeFromText(`
Name
email@test.com

EXPERIENCE
Developer at TechCo
Jan 2022 – Present
Developed REST APIs serving mobile clients. Managed PostgreSQL databases and caching. Collaborated with frontend team on contracts.

EDUCATION
Uni
BS
2018

SKILLS
Python
`);
    expect(r.parse_metadata.fallbacks_used.paragraph_to_bullet_fallback).toBe(true);
    expect(r.experience[0].bullets.length).toBeGreaterThan(0);
  });

  it("linkedin_bare_word_fallback when only 'linkedin' text found", () => {
    const r = buildResumeFromText(`
Name
email@test.com
555-000-0000
linkedin

EXPERIENCE
Dev — Co
2020 – 2023
• Built things.

EDUCATION
Uni
BS

SKILLS
Python
`);
    expect(r.parse_metadata.fallbacks_used.linkedin_bare_word_fallback).toBe(true);
    expect(r.contact.linkedin).toBe("linkedin.com");
  });
});
