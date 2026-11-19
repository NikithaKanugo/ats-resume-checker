"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { UIAnalysisResult, UIIssue } from "@/types/analysisUI";

interface ResumeVisualizationProps {
  analysis: UIAnalysisResult;
}

const SECTION_ORDER = ["contact", "summary", "experience", "education", "skills"];

const SECTION_LABELS: Record<string, string> = {
  contact: "Contact",
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
};

export function ResumeVisualization({ analysis }: ResumeVisualizationProps) {
  const issuesBySection = groupIssuesBySection(analysis.issues);

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-4">
        Resume Structure
      </p>

      {SECTION_ORDER.map((section, i) => {
        const sectionIssues = issuesBySection[section] ?? [];
        const hasIssues = sectionIssues.length > 0;

        return (
          <motion.div
            key={section}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className={`
              rounded-xl border p-4 transition-colors
              ${hasIssues
                ? "border-red-500/20 bg-red-500/[0.03]"
                : "border-white/5 bg-white/[0.02]"
              }
            `}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {hasIssues ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                )}
                <span className="text-sm font-medium text-white/70">
                  {SECTION_LABELS[section]}
                </span>
              </div>
              {hasIssues && (
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                  {sectionIssues.length} {sectionIssues.length === 1 ? "issue" : "issues"}
                </span>
              )}
            </div>

            {/* Content skeleton lines */}
            <div className="space-y-1.5 ml-5">
              {hasIssues ? (
                sectionIssues.slice(0, 3).map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-start gap-2 rounded-lg bg-red-500/5 px-3 py-2"
                  >
                    <span className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                      issue.severity === "critical" ? "bg-red-400" :
                      issue.severity === "major" ? "bg-amber-400" :
                      "bg-yellow-400"
                    }`} />
                    <p className="text-xs text-white/40 leading-relaxed">
                      {issue.title}
                    </p>
                  </div>
                ))
              ) : (
                <>
                  <div className="h-2 w-full rounded bg-white/[0.03]" />
                  <div className="h-2 w-4/5 rounded bg-white/[0.03]" />
                  <div className="h-2 w-3/5 rounded bg-white/[0.03]" />
                </>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function groupIssuesBySection(issues: UIIssue[]): Record<string, UIIssue[]> {
  const groups: Record<string, UIIssue[]> = {};
  for (const issue of issues) {
    const section = issue.target_section?.split(".")[0] ?? issue.category;
    const key = mapCategoryToSection(section);
    if (!groups[key]) groups[key] = [];
    groups[key].push(issue);
  }
  return groups;
}

function mapCategoryToSection(cat: string): string {
  if (cat === "parseability" || cat === "contact") return "contact";
  if (cat === "content_quality") return "experience";
  if (cat === "jd_match") return "skills";
  if (SECTION_ORDER.includes(cat)) return cat;
  return "experience";
}
