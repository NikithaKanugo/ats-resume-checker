import Link from "next/link";
import { FileText, Clock, ArrowUpRight } from "lucide-react";
import { listAnalyses } from "@/lib/utils/uploadStore";

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (score >= 65) return "text-blue-600 bg-blue-50 border-blue-200";
  if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-blue-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export default function HistoryPage() {
  const analyses = listAnalyses();

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All your past resume scans and scores.
        </p>
      </div>

      {analyses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 px-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium mb-1">No history yet</p>
          <p className="text-xs text-muted-foreground text-center max-w-xs mb-4">
            Your resume analysis results will appear here after your first scan.
          </p>
          <Link
            href="/analyze"
            className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Upload Resume
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyses.map((r) => (
            <Link
              key={r.analysis_id}
              href={`/results/${r.analysis_id}`}
              className="group relative rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover hover:border-primary/20"
            >
              {/* Top row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold truncate max-w-[160px]">
                      {r.candidate_name ?? "Unnamed Resume"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>

              {/* Score + issues */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">ATS Score</p>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-bold tabular-nums ${scoreColor(r.overall_score)}`}
                  >
                    {r.overall_score}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {r.issue_count} {r.issue_count === 1 ? "issue" : "issues"}
                </p>
              </div>

              {/* Score bar */}
              <div className="mt-3 h-1 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${scoreBg(r.overall_score)}`}
                  style={{ width: `${r.overall_score}%` }}
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
