/**
 * applyCaps.ts
 *
 * Pure functions for applying hard score ceilings.
 *
 * Caps are applied AFTER the raw score is computed from penalties.
 * The pipeline is:
 *   raw = max(0, 100 - totalPenalty)
 *   capped = applyScoreCap(raw, cap)      ← this file
 *   weighted = (capped / 100) * weight    ← computeSubscores
 */

/**
 * Apply a hard ceiling to a raw category score.
 *
 * @param rawScore  - Score computed from penalties (0–100)
 * @param cap       - Maximum allowed score, or null if no cap applies
 * @returns         - The lower of rawScore and cap
 */
export function applyScoreCap(rawScore: number, cap: number | null): number {
  if (cap === null) return rawScore;
  return Math.min(rawScore, cap);
}

/**
 * Determine whether a cap was actually binding — i.e., whether it lowered the score.
 * Used to populate the `cap_applied` field in CategoryScore (null when cap had no effect).
 */
export function resolveAppliedCap(
  rawScore: number,
  cap: number | null
): number | null {
  if (cap === null) return null;
  return rawScore > cap ? cap : null;
}
