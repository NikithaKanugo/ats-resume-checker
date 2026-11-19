/**
 * GET /api/analyses/[analysisId]
 *
 * Returns a previously computed AnalysisResult by ID.
 *
 * Query params:
 *   ?debug=1  — return lightweight diagnostic summary
 */

import { NextRequest } from "next/server";
import { getAnalysis } from "@/lib/utils/uploadStore";
import { ok, err } from "@/lib/utils/apiResponse";
import { buildDebugOutput } from "@/lib/utils/buildDebugOutput";

interface RouteParams {
  params: Promise<{ analysisId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { analysisId } = await params;

  if (!analysisId) {
    return err("analysisId is required.", 400, "MISSING_ID");
  }

  const result = getAnalysis(analysisId);

  if (!result) {
    return err(
      `No analysis found for id "${analysisId}".`,
      404,
      "ANALYSIS_NOT_FOUND"
    );
  }

  if (req.nextUrl.searchParams.get("debug") === "1") {
    return ok(buildDebugOutput(result));
  }

  return ok(result);
}
