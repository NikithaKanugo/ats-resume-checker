"use client";

import { motion } from "framer-motion";
import { RotateCcw, ArrowRight } from "lucide-react";
import { MotionWrapper } from "../shared/MotionWrapper";
import { BackgroundCanvas } from "../entry/BackgroundCanvas";
import { ScorePanel } from "./ScorePanel";
import { ResumeVisualization } from "./ResumeVisualization";
import { HighlightBadge } from "../shared/HighlightBadge";
import type { UIAnalysisResult } from "@/types/analysisUI";

interface ResultsStateProps {
  analysis: UIAnalysisResult;
  onReset: () => void;
}

export function ResultsState({ analysis, onReset }: ResultsStateProps) {
  return (
    <MotionWrapper className="relative min-h-screen">
      <BackgroundCanvas />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {analysis.candidate_name ?? "Resume Analysis"}
            </h2>
            <p className="text-xs text-white/30 mt-0.5 font-mono">
              {analysis.analysis_id.slice(0, 8)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`/results/${analysis.analysis_id}`}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white/80"
            >
              Full Report
              <ArrowRight className="h-3 w-3" />
            </a>
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white/80"
            >
              <RotateCcw className="h-3 w-3" />
              Check Another
            </button>
          </div>
        </motion.div>

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Left panel — structured */}
          <div className="lg:col-span-2 space-y-6">
            {/* Score */}
            <GlassCard>
              <ScorePanel analysis={analysis} />
            </GlassCard>

            {/* Priority fixes */}
            <GlassCard>
              <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">
                Priority Fixes ({analysis.priority_fixes.length})
              </p>
              <div className="space-y-2">
                {analysis.priority_fixes.map((fix, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="flex items-start gap-3 rounded-xl bg-white/[0.02] p-3"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-white/70">{fix.title}</span>
                        <HighlightBadge variant="success">
                          +{fix.estimated_score_lift} pts
                        </HighlightBadge>
                      </div>
                      <p className="text-[11px] text-white/30 mt-1 leading-relaxed">
                        {fix.suggested_action}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>

            {/* Issues summary */}
            <GlassCard>
              <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">
                Issues ({analysis.issues.length})
              </p>
              <div className="space-y-2">
                {analysis.issues.slice(0, 5).map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        issue.severity === "critical" ? "bg-red-400" :
                        issue.severity === "major" ? "bg-amber-400" :
                        "bg-yellow-400"
                      }`} />
                      <span className="text-xs text-white/50">{issue.title}</span>
                    </div>
                    <span className="text-[10px] text-white/20 tabular-nums">
                      -{issue.score_impact}
                    </span>
                  </div>
                ))}
                {analysis.issues.length > 5 && (
                  <p className="text-[11px] text-white/20 text-center pt-1">
                    +{analysis.issues.length - 5} more
                  </p>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Right panel — immersive resume visualization */}
          <div className="lg:col-span-3">
            <GlassCard>
              <ResumeVisualization analysis={analysis} />
            </GlassCard>

            {/* Strengths */}
            {analysis.strengths.length > 0 && (
              <GlassCard className="mt-6">
                <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">
                  Strengths ({analysis.strengths.length})
                </p>
                <div className="space-y-2">
                  {analysis.strengths.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-xs text-white/40">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                      {s.title}
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </MotionWrapper>
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-5 ${className}`}
    >
      {children}
    </div>
  );
}
