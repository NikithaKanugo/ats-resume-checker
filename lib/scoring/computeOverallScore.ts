/**
 * computeOverallScore.ts
 *
 * Derives the final overall score from computed subscores.
 *
 * Formula: overall = Σ weighted_score  (each weighted_score already = raw * weight/100)
 *
 * The overall score is bounded [0, 100] and rounded to one decimal place.
 * It is always the sum of the weighted subscores — no additional logic lives here.
 */

import type { CategoryScore } from "../../types/analysis";

export function computeOverallScore(subscores: CategoryScore[]): number {
  const raw = subscores.reduce((sum, s) => sum + s.weighted_score, 0);
  return clamp(round1(raw), 0, 100);
}

/**
 * Derive a human-readable grade band from the overall score.
 * Used for UI display — not part of the core scoring model.
 */
export function scoreToGrade(score: number): {
  label: string;
  description: string;
} {
  if (score >= 85) return { label: "Excellent", description: "Highly competitive for ATS screening." };
  if (score >= 70) return { label: "Good", description: "Likely to pass ATS screening with minor improvements." };
  if (score >= 55) return { label: "Fair", description: "May pass ATS screening but needs targeted improvements." };
  if (score >= 40) return { label: "Weak", description: "Likely to be filtered out. Significant improvements needed." };
  return { label: "Poor", description: "High risk of ATS rejection. Major revisions required." };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
