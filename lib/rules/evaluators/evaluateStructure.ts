/**
 * evaluateStructure.ts
 *
 * Evaluates resume organization: section presence, entry completeness,
 * date coverage, bullet presence, and document shape.
 *
 * Key design decision: section-missing rules (STRUCT_001–003) distinguish
 * between "truly missing" (no header detected) and "detected but empty"
 * (header found, parser failed to extract entries).  The latter gets a
 * softer penalty and does NOT activate score caps, because the content
 * likely exists — it just wasn't parseable.
 *
 * Entry-level completeness rules (STRUCT_004–010) are suppressed when
 * parse confidence is "low", since field extraction can't be trusted.
 */

import type { ResumeSchemaType } from "../../schemas/resumeSchema";
import type { EvaluatorResult, RuleDefinition, RuleViolation } from "../../../types/rules";
import { STRUCTURE_RULES_MAP } from "../definitions/structureRules";
import {
  hasExperienceSection,
  hasEducationSection,
  hasSkillsSection,
  hasSummarySection,
  computeExperienceStats,
  computeEducationStats,
  estimatePageCount,
} from "../helpers/sectionHelpers";
import { buildViolation, buildEvaluatorResult } from "./_buildResult";

export function evaluateStructure(resume: ResumeSchemaType): EvaluatorResult {
  const violations: RuleViolation[] = [];
  const triggeredCapRules: RuleDefinition[] = [];

  const detected = resume.parse_metadata.detected_sections;
  const confidence = resume.parse_metadata.parse_confidence;
  const isLowConfidence = confidence === "low";

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Fire a rule at full penalty. Activates cap if the rule defines one. */
  function check(
    ruleId: string,
    condition: boolean,
    message: string,
    target?: { section?: string; text?: string }
  ): void {
    if (!condition) return;
    const rule = STRUCTURE_RULES_MAP[ruleId];
    violations.push(buildViolation(rule, message, target));
    if (rule.isCap) triggeredCapRules.push(rule);
  }

  /**
   * Fire a rule at half penalty and do NOT activate its cap.
   * Used when the section header was detected but entry extraction failed —
   * the content likely exists, the parser just couldn't structure it.
   */
  function softCheck(
    ruleId: string,
    condition: boolean,
    message: string,
    target?: { section?: string; text?: string }
  ): void {
    if (!condition) return;
    const rule = STRUCTURE_RULES_MAP[ruleId];
    const violation = buildViolation(rule, message, target);
    violation.penalty = Math.round(rule.scoreImpact / 2);
    violations.push(violation);
    // Intentionally do NOT push to triggeredCapRules
  }

  // ── Pre-compute stats in one pass each ──────────────────────────────────
  const expStats = computeExperienceStats(resume, 2);
  const eduStats = computeEducationStats(resume);

  // ── Required sections ────────────────────────────────────────────────────
  //
  // For each section we distinguish:
  //   A) Header NOT detected AND no entries → truly missing → full penalty + cap
  //   B) Header detected BUT no entries     → parser weakness → half penalty, no cap
  //   C) Entries present                    → section exists → no violation
  //

  const expDetected = detected.includes("experience");
  const expPresent = hasExperienceSection(resume);

  if (!expPresent && !expDetected) {
    // (A) Truly missing
    check(
      "STRUCT_001",
      true,
      "No experience section was detected. This is the most critical section for ATS evaluation.",
      { section: "experience" }
    );
  } else if (!expPresent && expDetected) {
    // (B) Header found, extraction failed
    softCheck(
      "STRUCT_001",
      true,
      "An experience section header was detected but no entries could be extracted. The content may use non-standard formatting.",
      { section: "experience" }
    );
  }

  const eduDetected = detected.includes("education");
  const eduPresent = hasEducationSection(resume);

  if (!eduPresent && !eduDetected) {
    check(
      "STRUCT_002",
      true,
      "No education section was detected. Many job postings filter candidates by education level.",
      { section: "education" }
    );
  } else if (!eduPresent && eduDetected) {
    softCheck(
      "STRUCT_002",
      true,
      "An education section header was detected but no entries could be extracted. Check formatting.",
      { section: "education" }
    );
  }

  const skillsDetected = detected.includes("skills");
  const skillsPresent = hasSkillsSection(resume);

  if (!skillsPresent && !skillsDetected) {
    check(
      "STRUCT_003",
      true,
      "No skills section was detected. ATS systems depend heavily on skills keywords for candidate matching.",
      { section: "skills" }
    );
  } else if (!skillsPresent && skillsDetected) {
    softCheck(
      "STRUCT_003",
      true,
      "A skills section header was detected but no skills could be extracted. Check formatting.",
      { section: "skills" }
    );
  }

  // ── Experience entry completeness ───────────────────────────────────────
  //
  // These rules evaluate individual field quality within parsed entries.
  // When parse confidence is "low", field extraction is unreliable — firing
  // these rules would produce false positives.  Skip them.
  //

  if (!isLowConfidence) {
    check(
      "STRUCT_004",
      expStats.missingTitles.length > 0,
      `${expStats.missingTitles.length} experience ${pl(expStats.missingTitles.length, "entry", "entries")} ${pl(expStats.missingTitles.length, "is", "are")} missing a job title.`,
      { section: `experience.${expStats.missingTitles[0]}` }
    );

    check(
      "STRUCT_005",
      expStats.missingCompany.length > 0,
      `${expStats.missingCompany.length} experience ${pl(expStats.missingCompany.length, "entry", "entries")} ${pl(expStats.missingCompany.length, "is", "are")} missing a company name.`,
      { section: `experience.${expStats.missingCompany[0]}` }
    );

    check(
      "STRUCT_006",
      expStats.missingDates.length > 0,
      `${expStats.missingDates.length} experience ${pl(expStats.missingDates.length, "entry", "entries")} ${pl(expStats.missingDates.length, "is", "are")} missing start or end dates.`,
      { section: `experience.${expStats.missingDates[0]}` }
    );

    check(
      "STRUCT_007",
      expStats.missingBullets.length > 0,
      `${expStats.missingBullets.length} experience ${pl(expStats.missingBullets.length, "entry", "entries")} contain no bullet points.`,
      { section: `experience.${expStats.missingBullets[0]}` }
    );

    check(
      "STRUCT_008",
      expStats.tooFewBullets.length > 0,
      `${expStats.tooFewBullets.length} experience ${pl(expStats.tooFewBullets.length, "entry", "entries")} ${pl(expStats.tooFewBullets.length, "has", "have")} fewer than 2 bullet points. Aim for 3-6 per role.`,
      { section: `experience.${expStats.tooFewBullets[0]}.bullets` }
    );
  }

  // ── Education entry completeness ────────────────────────────────────────

  if (!isLowConfidence) {
    check(
      "STRUCT_009",
      eduStats.missingInstitution.length > 0,
      `${eduStats.missingInstitution.length} education ${pl(eduStats.missingInstitution.length, "entry", "entries")} ${pl(eduStats.missingInstitution.length, "is", "are")} missing an institution name.`,
      { section: `education.${eduStats.missingInstitution[0]}` }
    );

    check(
      "STRUCT_010",
      eduStats.missingDegree.length > 0,
      `${eduStats.missingDegree.length} education ${pl(eduStats.missingDegree.length, "entry", "entries")} ${pl(eduStats.missingDegree.length, "is", "are")} missing a degree or qualification.`,
      { section: `education.${eduStats.missingDegree[0]}` }
    );
  }

  // ── Document shape ────────────────────────────────────────────────────────

  const estimatedPages = estimatePageCount(resume);
  check(
    "STRUCT_011",
    estimatedPages > 2,
    `The resume is estimated at ~${estimatedPages} pages based on content length. Most ATS systems and recruiters prefer 1-2 pages.`
  );

  check(
    "STRUCT_012",
    !hasSummarySection(resume),
    "No professional summary was detected. A summary helps recruiters and ATS systems quickly qualify candidates.",
    { section: "summary" }
  );

  check(
    "STRUCT_013",
    resume.experience.length === 1,
    "Only one job is listed. Ensure this single entry is presented with full title, company, dates, and detailed bullets.",
    { section: "experience.0" }
  );

  return buildEvaluatorResult("structure", violations, triggeredCapRules);
}

function pl(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
