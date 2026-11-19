import Link from "next/link";
import { ArrowLeft, FileText, Home } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ScoreOverview } from "@/components/analysis/ScoreOverview";
import { SubscoreCards } from "@/components/analysis/SubscoreCards";
import { IssuesPanel } from "@/components/analysis/IssuesPanel";
import { PriorityFixesPanel } from "@/components/analysis/PriorityFixesPanel";
import { StrengthsPanel } from "@/components/analysis/StrengthsPanel";
import { getAnalysis } from "@/lib/utils/uploadStore";
import { toUIAnalysis } from "@/lib/utils/toUIAnalysis";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ analysisId: string }>;
}

function PanelSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function ResultsPage({ params }: PageProps) {
  const { analysisId } = await params;

  const raw = getAnalysis(analysisId);
  if (!raw) notFound();

  const analysis = toUIAnalysis(raw);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            Dashboard
          </Link>
          <Separator orientation="vertical" className="h-4" />
          <Link
            href="/analyze"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            New analysis
          </Link>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">
              {analysis.candidate_name ?? "Resume Analysis"}
            </span>
          </div>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {analysis.analysis_id.slice(0, 8)}
        </span>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">

        {/* Score card */}
        <div className="rounded-xl border border-border bg-card px-8 py-7 shadow-card space-y-5">
          <ScoreOverview
            score={analysis.overall_score}
            riskLevel={analysis.risk_level}
            confidence={analysis.confidence}
          />
          <Separator />
          <SubscoreCards subscores={analysis.subscores} />
        </div>

        {/* Two-column masonry */}
        <div className="columns-1 md:columns-2 gap-6 [column-fill:balance]">

          <div className="mb-6 break-inside-avoid rounded-xl border border-border bg-card px-6 py-5 shadow-card transition-shadow hover:shadow-card-hover">
            <PanelSection title={`Priority Fixes (${analysis.priority_fixes.length})`}>
              <PriorityFixesPanel fixes={analysis.priority_fixes} />
            </PanelSection>
          </div>

          {analysis.strengths.length > 0 && (
            <div className="mb-6 break-inside-avoid rounded-xl border border-border bg-card px-6 py-5 shadow-card transition-shadow hover:shadow-card-hover">
              <PanelSection title={`Strengths (${analysis.strengths.length})`}>
                <StrengthsPanel strengths={analysis.strengths} />
              </PanelSection>
            </div>
          )}

          <div className="mb-6 break-inside-avoid rounded-xl border border-border bg-card px-6 py-5 shadow-card transition-shadow hover:shadow-card-hover">
            <PanelSection title={`Issues (${analysis.issues.length})`}>
              <IssuesPanel issues={analysis.issues} />
            </PanelSection>
          </div>

          {analysis.gap_report && (
            <div className="mb-6 break-inside-avoid rounded-xl border border-border bg-card px-6 py-5 shadow-card transition-shadow hover:shadow-card-hover space-y-4">
              <PanelSection title={`Keyword Match (${analysis.gap_report.keyword_coverage_pct}%)`}>
                {analysis.gap_report.missing_required.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-red-600 mb-1.5">Missing Required</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.gap_report.missing_required.map((s) => (
                        <span key={s} className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs text-red-600">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.gap_report.missing_preferred.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-amber-600 mb-1.5">Missing Preferred</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.gap_report.missing_preferred.map((s) => (
                        <span key={s} className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-600">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.gap_report.found_required.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 mb-1.5">Matched</p>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.gap_report.found_required.map((s) => (
                        <span key={s} className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs text-emerald-600">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </PanelSection>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
