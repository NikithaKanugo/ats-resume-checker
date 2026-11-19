/**
 * uploadStore.ts
 *
 * Thin adapter that delegates to the repository layer.
 * Exists purely for backward compatibility — all callers import from here.
 * When ready to migrate, swap the implementation in repository/index.ts.
 */

import { repo } from "../repository";
import type { AnalysisResult } from "../../types/analysis";

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

export function saveUpload(uploadId: string, buffer: Buffer, filename: string): void {
  repo.uploads.save(uploadId, buffer, filename);
}

export function getUpload(
  uploadId: string
): { buffer: Buffer; filename: string; uploadedAt: string } | null {
  return repo.uploads.get(uploadId);
}

// ---------------------------------------------------------------------------
// Analyses
// ---------------------------------------------------------------------------

export function saveAnalysis(result: AnalysisResult): void {
  repo.analyses.save(result);
}

export function getAnalysis(analysisId: string): AnalysisResult | null {
  return repo.analyses.get(analysisId);
}

export function listAnalyses() {
  return repo.analyses.list();
}
