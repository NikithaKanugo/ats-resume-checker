import { ArrowUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { UIPriorityFix } from "@/types/analysisUI";

interface PriorityFixesPanelProps {
  fixes: UIPriorityFix[];
}

export function PriorityFixesPanel({ fixes }: PriorityFixesPanelProps) {
  if (fixes.length === 0) return null;

  return (
    <ol className="space-y-3">
      {fixes.map((fix, i) => (
        <li key={i} className="flex gap-3">
          {/* Rank badge */}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-bold text-white mt-0.5">
            {i + 1}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800">{fix.title}</span>
              <Badge className="gap-1 bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-semibold hover:bg-emerald-100">
                <ArrowUp className="h-2.5 w-2.5" />
                +{fix.estimated_score_lift} pts
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">{fix.reason}</p>
            <p className="text-xs font-medium text-slate-700 mt-1 bg-slate-50 rounded px-2 py-1">
              → {fix.suggested_action}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
