/**
 * repository/types.ts
 *
 * DB-agnostic interfaces for persistence.  All repository implementations
 * (disk, Supabase, Postgres, etc.) conform to these contracts.
 *
 * No framework imports, no fs, no SQL — pure TypeScript interfaces.
 */

import type { AnalysisResult, CategoryScore } from "../../types/analysis";
import type { RuleViolation } from "../../types/rules";
import type { ResumeSchemaType } from "../schemas/resumeSchema";

// ---------------------------------------------------------------------------
// Stored entity shapes (what gets persisted, not the full runtime object)
// ---------------------------------------------------------------------------

/** Lightweight summary returned by list operations. */
export interface AnalysisSummary {
  analysis_id: string;
  created_at: string;
  overall_score: number;
  candidate_name: string | null;
  issue_count: number;
  scoring_mode: string;
}

/** Upload metadata (the binary buffer is stored separately). */
export interface UploadRecord {
  upload_id: string;
  filename: string;
  size_bytes: number;
  uploaded_at: string;
}

// ---------------------------------------------------------------------------
// Repository interfaces
// ---------------------------------------------------------------------------

export interface UploadRepository {
  save(uploadId: string, buffer: Buffer, filename: string): void;
  get(uploadId: string): { buffer: Buffer; filename: string; uploadedAt: string } | null;
  delete(uploadId: string): void;
}

export interface AnalysisRepository {
  /** Persist a full analysis result (parsed resume + scores + issues). */
  save(result: AnalysisResult): void;

  /** Retrieve a full analysis result by ID. */
  get(analysisId: string): AnalysisResult | null;

  /** Delete an analysis by ID. */
  delete(analysisId: string): void;

  /** List all analyses as lightweight summaries, newest first. */
  list(): AnalysisSummary[];
}

/**
 * Combined repository facade.  Callers import this single interface
 * and don't need to know which backend is in use.
 */
export interface Repository {
  uploads: UploadRepository;
  analyses: AnalysisRepository;
}
