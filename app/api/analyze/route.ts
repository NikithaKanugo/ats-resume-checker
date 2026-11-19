/**
 * POST /api/analyze
 *
 * Accepts either:
 *   { resume_upload_id: string }  — analyze a previously uploaded file
 *   { raw_text: string }          — analyze pasted resume text directly
 *
 * Query params:
 *   ?debug=1  — return a lightweight diagnostic summary instead of the full result
 *
 * Calls the orchestrator, persists the result, and returns the full AnalysisResult.
 * No scoring or parsing logic lives here.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { getUpload, saveAnalysis } from "@/lib/utils/uploadStore";
import {
  runResumeOnlyAnalysis,
  runResumeOnlyAnalysisFromText,
} from "@/lib/orchestrators/runResumeOnlyAnalysis";
import { ok, err } from "@/lib/utils/apiResponse";
import { log } from "@/lib/utils/logger";
import { buildDebugOutput } from "@/lib/utils/buildDebugOutput";

// ---------------------------------------------------------------------------
// Request schema
// ---------------------------------------------------------------------------

const AnalyzeRequestSchema = z
  .object({
    resume_upload_id: z.string().uuid().optional(),
    raw_text: z.string().min(50).optional(),
  })
  .refine(
    (data) => data.resume_upload_id !== undefined || data.raw_text !== undefined,
    { message: "Provide either resume_upload_id or raw_text." }
  );

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return err("Request body must be valid JSON.", 400, "INVALID_JSON");
  }

  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return err(parsed.error.issues[0].message, 400, "VALIDATION_ERROR");
  }

  const { resume_upload_id, raw_text } = parsed.data;
  const debugMode = req.nextUrl.searchParams.get("debug") === "1";

  try {
    let result;

    if (resume_upload_id) {
      const upload = getUpload(resume_upload_id);
      if (!upload) {
        return err(
          `No upload found for id "${resume_upload_id}". Upload the file first via POST /api/upload.`,
          404,
          "UPLOAD_NOT_FOUND"
        );
      }
      result = await runResumeOnlyAnalysis({
        buffer: upload.buffer,
        filename: upload.filename,
      });
    } else {
      // raw_text is guaranteed by the Zod refine above
      result = runResumeOnlyAnalysisFromText(raw_text!);
    }

    saveAnalysis(result);

    if (debugMode) {
      return ok(buildDebugOutput(result), 200);
    }

    return ok(result, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Analysis failed.";
    log.error("analysis_route_error", {
      error: message,
      upload_id: resume_upload_id,
    });
    return err(message, 500, "ANALYSIS_ERROR");
  }
}
