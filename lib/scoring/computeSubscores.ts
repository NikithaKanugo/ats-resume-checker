/**
 * computeSubscores.ts
 *
 * Converts raw EvaluatorResults into weighted CategoryScores.
 *
 * Per-category pipeline:
 *   1. raw_score      = max(0, 100 - totalPenalty)
 *   2. capped_score   = min(raw_score, cap)  if cap is not null
 *   3. weighted_score = (capped_score / 100) * weight
 *
 * Categories with weight === 0 (e.g., jd_match in resume-only mode)
 * are excluded from the output — the orchestrator controls which
 * evaluators run, so a missing result is not an error.
 */

import type { EvaluatorResult, RuleCategory } from "../../types/rules";
import type { CategoryScore, ScoringMode } from "../../types/analysis";
import { getWeights } from "./weights";
import { applyScoreCap, resolveAppliedCap } from "./applyCaps";

export function computeSubscores(
  evaluatorResults: EvaluatorResult[],
  mode: ScoringMode
): CategoryScore[] {
  const weights = getWeights(mode);
  const resultsByCategory = indexByCategory(evaluatorResults);

  const subscores: CategoryScore[] = [];

  for (const [category, weight] of Object.entries(weights) as [RuleCategory, number][]) {
    if (weight === 0) continue;

    const result = resultsByCategory[category];

    if (!result) {
      // Evaluator was not run — treat as a perfect score for that category.
      // This should not happen in a well-configured pipeline, but is safe to handle.
      subscores.push({
        category,
        raw_score: 100,
        weight,
        weighted_score: weight,
        cap_applied: null,
      });
      continue;
    }

    const rawScore = Math.max(0, 100 - result.totalPenalty);
    const cappedScore = applyScoreCap(rawScore, result.cap);
    const capApplied = resolveAppliedCap(rawScore, result.cap);
    const weightedScore = round2((cappedScore / 100) * weight);

    subscores.push({
      category,
      raw_score: round2(rawScore),
      weight,
      weighted_score: weightedScore,
      cap_applied: capApplied,
    });
  }

  return subscores;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function indexByCategory(
  results: EvaluatorResult[]
): Partial<Record<RuleCategory, EvaluatorResult>> {
  return Object.fromEntries(results.map((r) => [r.category, r]));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
