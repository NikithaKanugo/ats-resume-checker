/**
 * _buildResult.ts
 *
 * Internal factory helpers shared by all evaluators.
 * Not exported from the public rules index.
 */

import type { RuleDefinition } from "../../../types/rules";
import type { RuleViolation, EvaluatorResult, RuleCategory } from "../../../types/rules";

export function buildViolation(
  rule: RuleDefinition,
  message: string,
  target?: { section?: string; text?: string }
): RuleViolation {
  return {
    ruleId: rule.id,
    title: rule.title,
    category: rule.category,
    severity: rule.severity,
    message,
    penalty: rule.scoreImpact,
    target_section: target?.section,
    target_text: target?.text,
  };
}

export function buildEvaluatorResult(
  category: RuleCategory,
  violations: RuleViolation[],
  capRules: RuleDefinition[]
): EvaluatorResult {
  const totalPenalty = violations.reduce((sum, v) => sum + v.penalty, 0);

  // The effective cap is the lowest capValue among all triggered cap rules
  const triggeredCaps = capRules
    .filter((r) => r.isCap && r.capValue !== undefined)
    .map((r) => r.capValue as number);

  const cap = triggeredCaps.length > 0 ? Math.min(...triggeredCaps) : null;

  return { category, violations, totalPenalty, cap };
}
