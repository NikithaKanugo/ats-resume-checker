/**
 * evaluateParseability.ts
 *
 * Evaluates whether the resume can be reliably parsed by an ATS system.
 * Checks contact completeness, section detection, and document length.
 */

import type { ResumeSchemaType } from "../../schemas/resumeSchema";
import type { EvaluatorResult, RuleDefinition, RuleViolation } from "../../../types/rules";
import { PARSEABILITY_RULES_MAP } from "../definitions/parseabilityRules";
import { countWords } from "../helpers/sectionHelpers";
import { buildViolation, buildEvaluatorResult } from "./_buildResult";

export function evaluateParseability(resume: ResumeSchemaType): EvaluatorResult {
  const violations: RuleViolation[] = [];
  const triggeredCapRules: RuleDefinition[] = [];

  function check(
    ruleId: string,
    condition: boolean,
    message: string,
    target?: { section?: string; text?: string }
  ): void {
    if (!condition) return;
    const rule = PARSEABILITY_RULES_MAP[ruleId];
    violations.push(buildViolation(rule, message, target));
    if (rule.isCap) triggeredCapRules.push(rule);
  }

  const { contact, raw_text, parse_metadata } = resume;

  // PARSE_001: Resume too short — likely image-based or empty
  check(
    "PARSE_001",
    raw_text.length < 100,
    `Extracted text is only ${raw_text.length} characters. The file may be image-based, password-protected, or empty.`
  );

  // PARSE_006: No section headers
  check(
    "PARSE_006",
    parse_metadata.detected_sections.length === 0,
    "No section headers were detected. The resume appears to have no standard structure (Experience, Education, Skills, etc.)."
  );

  // PARSE_002: Low parse confidence
  check(
    "PARSE_002",
    parse_metadata.parse_confidence === "low",
    "The parser assigned low confidence to this resume. Key sections may be missing or unreadable."
  );

  // PARSE_003: No contact information at all
  const hasAnyContact = Boolean(contact.name || contact.email || contact.phone);
  check(
    "PARSE_003",
    !hasAnyContact,
    "No contact information (name, email, or phone) was detected in the resume.",
    { section: "contact" }
  );

  // PARSE_004: Missing email
  check(
    "PARSE_004",
    !contact.email,
    "No valid email address was found. Email is a required contact field for ATS systems.",
    { section: "contact" }
  );

  // PARSE_005: Missing phone number
  check(
    "PARSE_005",
    !contact.phone,
    "No phone number was detected. Most recruiters and ATS systems expect a phone number.",
    { section: "contact" }
  );

  // PARSE_007: Insufficient word count
  const wordCount = countWords(raw_text);
  check(
    "PARSE_007",
    wordCount < 300,
    `The resume contains only ${wordCount} words. A substantive resume should have at least 400–600 words.`
  );

  // PARSE_008: Candidate name missing
  check(
    "PARSE_008",
    !contact.name,
    "No candidate name was detected at the top of the resume.",
    { section: "contact" }
  );

  // PARSE_009: No LinkedIn or GitHub
  check(
    "PARSE_009",
    !contact.linkedin && !contact.github,
    "No LinkedIn or GitHub profile URL was found. These improve recruiter confidence and ATS profile completeness.",
    { section: "contact" }
  );

  return buildEvaluatorResult("parseability", violations, triggeredCapRules);
}
