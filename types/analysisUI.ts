export type RiskLevel = "low" | "medium" | "high";
export type ConfidenceLevel = "low" | "medium" | "high";
export type IssueSeverity = "critical" | "major" | "minor";

export interface UIIssue {
  id: string;
  title: string;
  category: string;
  severity: IssueSeverity;
  score_impact: number;
  what_we_found: string;
  how_to_fix: string;
  target_section?: string;
  target_text?: string;
}

export interface UIPriorityFix {
  title: string;
  /** Estimated overall score improvement after category weighting. */
  estimated_score_lift: number;
  reason: string;
  suggested_action: string;
  /** Which resume section to edit (e.g. "experience", "skills", "contact"). */
  target_section?: string;
}

export interface UIStrength {
  id: string;
  title: string;
  category: string;
  reason: string;
}

/**
 * Skill and keyword gap vs. the job description.
 * Only present when scoring_mode === "resume_and_jd".
 */
export interface UIGapReport {
  found_required: string[];
  missing_required: string[];
  found_preferred: string[];
  missing_preferred: string[];
  found_keywords: string[];
  missing_keywords: string[];
  keyword_coverage_pct: number;
}

export interface ParsedContact {
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
}

export interface ParsedExperience {
  title?: string;
  company?: string;
  start_date?: string;
  end_date?: string;
  bullets?: string[];
}

export interface ParsedEducation {
  degree?: string;
  institution?: string;
  end_date?: string;
}

export interface ParsedProject {
  name?: string;
  bullets?: string[];
}

export interface ParsedResume {
  contact?: ParsedContact;
  summary?: { text?: string };
  skills?: { normalized?: string[] };
  experience?: ParsedExperience[];
  education?: ParsedEducation[];
  projects?: ParsedProject[];
}

export interface UISubscores {
  parseability: number;
  structure: number;
  content_quality: number;
  jd_match: number | null;
}

export interface UIAnalysisResult {
  analysis_id: string;
  candidate_name?: string;
  overall_score: number;
  /**
   * Confidence band: how many ± points the score may vary due to parse quality.
   * 0 = high confidence, 5 = medium, 10 = low.
   */
  score_margin: number;
  risk_level: RiskLevel;
  confidence: ConfidenceLevel;
  subscores: UISubscores;
  issues: UIIssue[];
  priority_fixes: UIPriorityFix[];
  strengths: UIStrength[];
  gap_report: UIGapReport | null;
  parsed_resume: ParsedResume;
}
