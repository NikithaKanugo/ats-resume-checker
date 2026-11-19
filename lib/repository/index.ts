/**
 * repository/index.ts
 *
 * Single import point for the persistence layer.
 * Swap the implementation here when migrating to Supabase/Postgres —
 * no other file needs to change.
 */

import { diskRepository } from "./diskRepository";
import type { Repository } from "./types";

export const repo: Repository = diskRepository;

export type { Repository, UploadRepository, AnalysisRepository, AnalysisSummary, UploadRecord } from "./types";
