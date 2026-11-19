import type { RuleViolation } from "./rules";
import type { ResumeSchemaType } from "../lib/schemas/resumeSchema";

export type ScoringMode = "resume_only" | "resume_and_jd";

export interface CategoryScore {
  category: string;
  raw_score: number;
  weight: number;
  weighted_score: number;
  cap_applied: number | null;
}

export interface PriorityFix {
  rank: number;
  ruleId: string;
  title: string;
  severity: string;
  /** Raw category penalty points removed when this issue is fixed (0–100 scale). */
  impact: number;
  /** Estimated overall score improvement after category weighting. */
  weighted_lift: number;
  suggestion: string;
  /** Which resume section to edit to resolve this fix. */
  target_section?: string;
}

/**
 * Skill and keyword gap between the resume and a job description.
 * Null when no JD was provided (resume-only mode).
 */
export interface GapReport {
  found_required: string[];
  missing_required: string[];
  found_preferred: string[];
  missing_preferred: string[];
  found_keywords: string[];
  missing_keywords: string[];
  keyword_coverage_pct: number;
}

export interface AnalysisResult {
  analysis_id: string;
  created_at: string;
  scoring_mode: ScoringMode;
  overall_score: number;
  subscores: CategoryScore[];
  issues: RuleViolation[];
  strengths: string[];
  priority_fixes: PriorityFix[];
  gap_report: GapReport | null;
  parsed_resume: ResumeSchemaType;
  metadata: {
    resume_char_count: number;
    parse_confidence: string;
    detected_sections: string[];
    parse_warnings: string[];
  };
}
