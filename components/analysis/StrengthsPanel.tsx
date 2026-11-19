import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UIStrength } from "@/types/analysisUI";

const categoryColors: Record<string, string> = {
  structure:       "bg-blue-50 text-blue-600 border-blue-100",
  parseability:    "bg-violet-50 text-violet-600 border-violet-100",
  content_quality: "bg-amber-50 text-amber-600 border-amber-100",
  jd_match:        "bg-teal-50 text-teal-600 border-teal-100",
};

interface StrengthsPanelProps {
  strengths: UIStrength[];
}

export function StrengthsPanel({ strengths }: StrengthsPanelProps) {
  if (strengths.length === 0) return null;

  return (
    <ul className="space-y-2">
      {strengths.map((s) => (
        <li key={s.id} className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-800">{s.title}</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] font-semibold capitalize",
                  categoryColors[s.category] ?? "bg-slate-50 text-slate-500"
                )}
              >
                {s.category.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{s.reason}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
