"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { EntryState } from "./entry/EntryState";
import { UploadState } from "./upload/UploadState";
import { AnalysisState } from "./analysis/AnalysisState";
import { ResultsState } from "./results/ResultsState";
import type { UIAnalysisResult } from "@/types/analysisUI";

type AppState = "entry" | "upload" | "analysis" | "results";

export function AppContainer() {
  const [state, setState] = useState<AppState>("entry");
  const [analysis, setAnalysis] = useState<UIAnalysisResult | null>(null);

  const handleAnalyze = useCallback(async (file: File) => {
    // Upload
    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    if (!uploadRes.ok) {
      const body = await uploadRes.json();
      throw new Error(body.error ?? "Upload failed.");
    }
    const { upload_id } = await uploadRes.json();

    // Trigger analysis state animation
    setState("analysis");

    // Analyze
    const analyzeRes = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume_upload_id: upload_id }),
    });
    if (!analyzeRes.ok) {
      const body = await analyzeRes.json();
      throw new Error(body.error ?? "Analysis failed.");
    }

    // Fetch UI-ready result via the adapter endpoint
    const result = await analyzeRes.json();

    // Transform to UI shape client-side (lightweight mapping)
    setAnalysis(toUIShape(result));
  }, []);

  const handleAnalysisComplete = useCallback(() => {
    if (analysis) {
      setState("results");
    }
  }, [analysis]);

  const handleReset = useCallback(() => {
    setAnalysis(null);
    setState("upload");
  }, []);

  return (
    <AnimatePresence mode="wait">
      {state === "entry" && (
        <EntryState key="entry" onStart={() => setState("upload")} />
      )}
      {state === "upload" && (
        <UploadState key="upload" onAnalyze={handleAnalyze} />
      )}
      {state === "analysis" && (
        <AnalysisState key="analysis" onComplete={handleAnalysisComplete} />
      )}
      {state === "results" && analysis && (
        <ResultsState key="results" analysis={analysis} onReset={handleReset} />
      )}
    </AnimatePresence>
  );
}

/**
 * Lightweight client-side transform from raw AnalysisResult to UIAnalysisResult.
 * Maps the backend shape to what the UI components expect.
 */
function toUIShape(raw: Record<string, unknown>): UIAnalysisResult {
  const subscores = raw.subscores as { category: string; raw_score: number }[];
  const sub = (cat: string) =>
    Math.round(subscores?.find((s) => s.category === cat)?.raw_score ?? 0);

  const confidence = (raw.metadata as Record<string, unknown>)?.parse_confidence as string ?? "medium";
  const score = Math.round(raw.overall_score as number);
  const resume = raw.parsed_resume as Record<string, unknown> | undefined;
  const contact = resume?.contact as Record<string, string | null> | undefined;

  return {
    analysis_id: raw.analysis_id as string,
    candidate_name: contact?.name ?? undefined,
    overall_score: score,
    score_margin: confidence === "high" ? 0 : confidence === "medium" ? 5 : 10,
    risk_level: score >= 70 ? "low" : score >= 50 ? "medium" : "high",
    confidence: confidence as "high" | "medium" | "low",
    subscores: {
      parseability: sub("parseability"),
      structure: sub("structure"),
      content_quality: sub("content_quality"),
      jd_match: (raw.scoring_mode as string) === "resume_and_jd" ? sub("jd_match") : null,
    },
    issues: ((raw.issues as Record<string, unknown>[]) ?? []).map((v, i) => ({
      id: `${v.ruleId}-${i}`,
      title: v.title as string,
      category: v.category as string,
      severity: mapSeverity(v.severity as string),
      score_impact: v.penalty as number,
      what_we_found: v.message as string,
      how_to_fix: v.message as string,
      target_section: v.target_section as string | undefined,
      target_text: v.target_text as string | undefined,
    })),
    priority_fixes: ((raw.priority_fixes as Record<string, unknown>[]) ?? []).map((f) => ({
      title: f.title as string,
      estimated_score_lift: (f.weighted_lift ?? f.impact ?? 0) as number,
      reason: f.suggestion as string,
      suggested_action: f.suggestion as string,
      target_section: f.target_section as string | undefined,
    })),
    strengths: ((raw.strengths as string[]) ?? []).map((s, i) => ({
      id: `strength-${i}`,
      title: s,
      category: "structure",
      reason: "",
    })),
    gap_report: null,
    parsed_resume: {},
  };
}

function mapSeverity(s: string): "critical" | "major" | "minor" {
  if (s === "critical") return "critical";
  if (s === "high") return "major";
  return "minor";
}
