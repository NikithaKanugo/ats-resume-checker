/**
 * repository/diskRepository.ts
 *
 * Disk-based implementation of the Repository interface.
 * Writes to /tmp/ats-dev/ — survives Next.js hot reloads but
 * NOT suitable for production (not shared across instances).
 *
 * Drop-in replaceable with a Supabase/Postgres implementation
 * that conforms to the same Repository interface.
 */

import fs from "fs";
import path from "path";
import type { AnalysisResult } from "../../types/analysis";
import type {
  Repository,
  UploadRepository,
  AnalysisRepository,
  AnalysisSummary,
} from "./types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_DIR = path.join("/tmp", "ats-dev");
const UPLOADS_DIR = path.join(BASE_DIR, "uploads");
const ANALYSES_DIR = path.join(BASE_DIR, "analyses");

function ensureDirs() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(ANALYSES_DIR, { recursive: true });
}

// ---------------------------------------------------------------------------
// Upload repository
// ---------------------------------------------------------------------------

interface UploadMeta {
  filename: string;
  size_bytes: number;
  uploaded_at: string;
}

const diskUploads: UploadRepository = {
  save(uploadId, buffer, filename) {
    ensureDirs();
    fs.writeFileSync(path.join(UPLOADS_DIR, `${uploadId}.bin`), buffer);
    const meta: UploadMeta = {
      filename,
      size_bytes: buffer.length,
      uploaded_at: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(UPLOADS_DIR, `${uploadId}.json`),
      JSON.stringify(meta)
    );
  },

  get(uploadId) {
    const binPath = path.join(UPLOADS_DIR, `${uploadId}.bin`);
    const metaPath = path.join(UPLOADS_DIR, `${uploadId}.json`);
    if (!fs.existsSync(binPath) || !fs.existsSync(metaPath)) return null;

    const buffer = fs.readFileSync(binPath);
    const meta: UploadMeta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    return { buffer, filename: meta.filename, uploadedAt: meta.uploaded_at };
  },

  delete(uploadId) {
    const binPath = path.join(UPLOADS_DIR, `${uploadId}.bin`);
    const metaPath = path.join(UPLOADS_DIR, `${uploadId}.json`);
    if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
    if (fs.existsSync(metaPath)) fs.unlinkSync(metaPath);
  },
};

// ---------------------------------------------------------------------------
// Analysis repository
// ---------------------------------------------------------------------------

const diskAnalyses: AnalysisRepository = {
  save(result) {
    ensureDirs();
    fs.writeFileSync(
      path.join(ANALYSES_DIR, `${result.analysis_id}.json`),
      JSON.stringify(result)
    );
  },

  get(analysisId) {
    const filePath = path.join(ANALYSES_DIR, `${analysisId}.json`);
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as AnalysisResult;
  },

  delete(analysisId) {
    const filePath = path.join(ANALYSES_DIR, `${analysisId}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  },

  list() {
    ensureDirs();
    const files = fs.readdirSync(ANALYSES_DIR).filter((f) => f.endsWith(".json"));

    const summaries: AnalysisSummary[] = [];

    for (const f of files) {
      try {
        const data = JSON.parse(
          fs.readFileSync(path.join(ANALYSES_DIR, f), "utf-8")
        ) as AnalysisResult;
        summaries.push({
          analysis_id: data.analysis_id,
          created_at: data.created_at,
          overall_score: Math.round(data.overall_score),
          candidate_name: data.parsed_resume?.contact?.name ?? null,
          issue_count: data.issues.length,
          scoring_mode: data.scoring_mode,
        });
      } catch {
        // Corrupted file — skip silently
      }
    }

    return summaries.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },
};

// ---------------------------------------------------------------------------
// Combined facade
// ---------------------------------------------------------------------------

export const diskRepository: Repository = {
  uploads: diskUploads,
  analyses: diskAnalyses,
};
