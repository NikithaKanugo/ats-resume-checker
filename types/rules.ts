export type RuleCategory =
  | "parseability"
  | "structure"
  | "content_quality"
  | "jd_match";

export type RuleSeverity = "critical" | "high" | "medium" | "low";

export interface RuleDefinition {
  id: string;
  title: string;
  description: string;
  category: RuleCategory;
  severity: RuleSeverity;
  /** Points deducted from the category score (0–100) when triggered */
  scoreImpact: number;
  /** If true, caps the category score at a ceiling even after other penalties */
  isCap?: boolean;
  capValue?: number;
}

export interface RuleViolation {
  ruleId: string;
  title: string;
  category: RuleCategory;
  severity: RuleSeverity;
  message: string;
  penalty: number;
  /** Dotted path to the resume section this violation targets (e.g. "experience.0", "contact", "skills"). */
  target_section?: string;
  /** Exact text snippet (e.g. a bullet) that triggered the violation. */
  target_text?: string;
}

export interface EvaluatorResult {
  category: RuleCategory;
  violations: RuleViolation[];
  totalPenalty: number;
  /** Hard ceiling applied to this category's raw score, if any */
  cap: number | null;
}
