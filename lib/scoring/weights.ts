/**
 * weights.ts
 *
 * Canonical weight tables for each scoring mode.
 * These are the only place weights are defined — no magic numbers elsewhere.
 *
 * Invariant: weights in each mode must sum to 100.
 */

import type { RuleCategory } from "../../types/rules";
import type { ScoringMode } from "../../types/analysis";

export type WeightMap = Record<RuleCategory, number>;

export const RESUME_ONLY_WEIGHTS: WeightMap = {
  parseability: 30,
  structure: 30,
  content_quality: 40,
  jd_match: 0, // not evaluated in resume-only mode
};

export const RESUME_AND_JD_WEIGHTS: WeightMap = {
  parseability: 20,
  structure: 20,
  content_quality: 20,
  jd_match: 40,
};

export function getWeights(mode: ScoringMode): WeightMap {
  return mode === "resume_only" ? RESUME_ONLY_WEIGHTS : RESUME_AND_JD_WEIGHTS;
}

/**
 * Validate that a weight map sums to 100 (excluding zero-weight categories).
 * Used in tests — not called at runtime.
 */
export function assertWeightsSumTo100(weights: WeightMap): void {
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  if (total !== 100) {
    throw new Error(`Weight map must sum to 100, got ${total}`);
  }
}
