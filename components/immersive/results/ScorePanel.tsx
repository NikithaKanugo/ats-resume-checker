"use client";

import { motion } from "framer-motion";
import { HighlightBadge } from "../shared/HighlightBadge";
import type { UIAnalysisResult } from "@/types/analysisUI";

interface ScorePanelProps {
  analysis: UIAnalysisResult;
}

function scoreGradient(score: number) {
  if (score >= 80) return "from-emerald-400 to-emerald-600";
  if (score >= 65) return "from-blue-400 to-blue-600";
  if (score >= 50) return "from-amber-400 to-amber-600";
  return "from-red-400 to-red-600";
}

function scoreLabel(score: number) {
  if (score >= 80) return { text: "Excellent", variant: "success" as const };
  if (score >= 65) return { text: "Good", variant: "success" as const };
  if (score >= 50) return { text: "Fair", variant: "warning" as const };
  return { text: "Weak", variant: "error" as const };
}

const SUB_LABELS: Record<string, string> = {
  parseability: "Parseability",
  structure: "Structure",
  content_quality: "Content",
  jd_match: "JD Match",
};

export function ScorePanel({ analysis }: ScorePanelProps) {
  const label = scoreLabel(analysis.overall_score);

  return (
    <div className="space-y-6">
      {/* Overall score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-center"
      >
        <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-3">
          ATS Score
        </p>
        <div className="relative inline-flex items-center justify-center">
          <svg width="120" height="120" className="-rotate-90">
            <circle cx="60" cy="60" r="50" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
            <motion.circle
              cx="60" cy="60" r="50"
              strokeWidth="8" fill="none" strokeLinecap="round"
              className={`stroke-current bg-gradient-to-r ${scoreGradient(analysis.overall_score)}`}
              style={{ stroke: analysis.overall_score >= 80 ? "#34d399" : analysis.overall_score >= 65 ? "#60a5fa" : analysis.overall_score >= 50 ? "#fbbf24" : "#f87171" }}
              initial={{ strokeDasharray: `0 ${2 * Math.PI * 50}` }}
              animate={{ strokeDasharray: `${(analysis.overall_score / 100) * 2 * Math.PI * 50} ${2 * Math.PI * 50}` }}
              transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-3xl font-bold tabular-nums"
            >
              {analysis.overall_score}
            </motion.span>
          </div>
        </div>
        <div className="mt-2">
          <HighlightBadge variant={label.variant}>{label.text}</HighlightBadge>
        </div>
      </motion.div>

      {/* Subscore breakdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-3"
      >
        <p className="text-xs font-medium text-white/30 uppercase tracking-widest">
          Breakdown
        </p>
        {Object.entries({
          parseability: analysis.subscores.parseability,
          structure: analysis.subscores.structure,
          content_quality: analysis.subscores.content_quality,
          ...(analysis.subscores.jd_match !== null ? { jd_match: analysis.subscores.jd_match } : {}),
        }).map(([key, value]) => (
          <SubscoreBar key={key} label={SUB_LABELS[key] ?? key} score={value as number} />
        ))}
      </motion.div>
    </div>
  );
}

function SubscoreBar({ label, score }: { label: string; score: number }) {
  const barColor =
    score >= 80 ? "bg-emerald-500" :
    score >= 65 ? "bg-blue-500" :
    score >= 50 ? "bg-amber-500" :
    "bg-red-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-white/50">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-white/70">{score}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>
    </div>
  );
}
