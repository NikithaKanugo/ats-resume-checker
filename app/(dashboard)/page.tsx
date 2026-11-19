import Link from "next/link";
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { listAnalyses } from "@/lib/utils/uploadStore";

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (score >= 65) return "text-blue-600 bg-blue-50 border-blue-200";
  if (score >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-red-600 bg-red-50 border-red-200";
}

function scoreTextColor(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-blue-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export default function DashboardPage() {
  const recent = listAnalyses().slice(0, 6);
  const totalScans = recent.length;
  const avgScore = totalScans > 0
    ? Math.round(recent.reduce((s, r) => s + r.overall_score, 0) / totalScans)
    : 0;
  const totalIssues = recent.reduce((s, r) => s + r.issue_count, 0);

  return (
    <div className="px-8 py-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload, analyze, and improve your resume for ATS systems.
        </p>
      </div>

      {/* Upload CTA */}
      <Link
        href="/analyze"
        className="group flex items-center justify-between rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-card-hover hover:border-primary/20"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Upload Resume</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag & drop a PDF or DOCX to get your ATS score
            </p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </Link>

      {/* Stats row */}
      {totalScans > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<FileText className="h-4 w-4" />}
            label="Total Scans"
            value={String(totalScans)}
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="Avg Score"
            value={`${avgScore}/100`}
            valueColor={scoreTextColor(avgScore)}
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Issues Found"
            value={String(totalIssues)}
          />
        </div>
      )}

      {/* Recent scans */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Recent Scans</h2>
          {totalScans > 0 && (
            <Link
              href="/history"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all
            </Link>
          )}
        </div>

        {totalScans === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((r) => (
              <Link
                key={r.analysis_id}
                href={`/results/${r.analysis_id}`}
                className="group rounded-xl border border-border bg-card p-5 shadow-card transition-all hover:shadow-card-hover hover:border-primary/20"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium truncate max-w-[160px]">
                      {r.candidate_name ?? "Unnamed Resume"}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${scoreColor(r.overall_score)}`}
                  >
                    {r.overall_score}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{r.issue_count} issues</span>
                  <span>
                    {new Date(r.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>

                {/* Score bar */}
                <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      r.overall_score >= 80
                        ? "bg-emerald-500"
                        : r.overall_score >= 65
                          ? "bg-blue-500"
                          : r.overall_score >= 50
                            ? "bg-amber-500"
                            : "bg-red-500"
                    }`}
                    style={{ width: `${r.overall_score}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick insights */}
      {totalScans > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-4">Quick Insights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InsightCard
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              title="Parsing"
              description="Resume text extraction and section detection quality"
            />
            <InsightCard
              icon={<TrendingUp className="h-4 w-4 text-blue-500" />}
              title="Scoring"
              description="Rule-based evaluation across structure, content, and parseability"
            />
            <InsightCard
              icon={<FileText className="h-4 w-4 text-violet-500" />}
              title="JD Match"
              description="Keyword coverage and skill alignment with job descriptions"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${valueColor ?? ""}`}>
        {value}
      </p>
    </div>
  );
}

function InsightCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 px-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
        <FileText className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium mb-1">No scans yet</p>
      <p className="text-xs text-muted-foreground text-center max-w-xs mb-4">
        Upload your first resume to get an instant ATS compatibility score and actionable improvement suggestions.
      </p>
      <Link
        href="/analyze"
        className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity"
      >
        Upload Resume
      </Link>
    </div>
  );
}
