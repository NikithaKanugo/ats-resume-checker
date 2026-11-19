import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RiskLevel, ConfidenceLevel } from "@/types/analysisUI";

interface ScoreOverviewProps {
  score: number;
  riskLevel: RiskLevel;
  confidence: ConfidenceLevel;
}

function scoreColor(score: number) {
  if (score >= 80) return { ring: "stroke-emerald-500", text: "text-emerald-600" };
  if (score >= 65) return { ring: "stroke-blue-500",   text: "text-blue-600" };
  if (score >= 50) return { ring: "stroke-amber-500",  text: "text-amber-600" };
  return { ring: "stroke-red-500", text: "text-red-600" };
}

function scoreLabel(score: number) {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 35) return "Weak";
  return "Poor";
}

const riskConfig: Record<RiskLevel, { label: string; className: string }> = {
  low:    { label: "Low Risk",    className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  medium: { label: "Medium Risk", className: "bg-amber-100 text-amber-700 border-amber-200" },
  high:   { label: "High Risk",   className: "bg-red-100 text-red-700 border-red-200" },
};

const confidenceConfig: Record<ConfidenceLevel, { label: string; className: string }> = {
  high:   { label: "High Confidence",   className: "bg-slate-100 text-slate-600 border-slate-200" },
  medium: { label: "Medium Confidence", className: "bg-slate-100 text-slate-600 border-slate-200" },
  low:    { label: "Low Confidence",    className: "bg-slate-100 text-slate-500 border-slate-200" },
};

export function ScoreOverview({ score, riskLevel, confidence }: ScoreOverviewProps) {
  const { ring, text } = scoreColor(score);

  // SVG ring math
  const r = 52;
  const circ = 2 * Math.PI * r;
  const progress = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      {/* Score ring */}
      <div className="relative flex items-center justify-center">
        <svg width="140" height="140" className="-rotate-90">
          <circle cx="70" cy="70" r={r} stroke="#e2e8f0" strokeWidth="10" fill="none" />
          <circle
            cx="70" cy="70" r={r}
            strokeWidth="10" fill="none"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circ}`}
            className={cn("transition-all duration-700", ring)}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={cn("text-4xl font-bold tabular-nums", text)}>{score}</span>
          <span className="text-xs text-slate-400 font-medium">/100</span>
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <p className={cn("text-lg font-semibold", text)}>{scoreLabel(score)}</p>
        <p className="text-xs text-slate-500 mt-0.5">ATS Compatibility Score</p>
      </div>

      {/* Badges */}
      <div className="flex gap-2 flex-wrap justify-center">
        <Badge
          variant="outline"
          className={cn("text-xs font-medium", riskConfig[riskLevel].className)}
        >
          {riskConfig[riskLevel].label}
        </Badge>
        <Badge
          variant="outline"
          className={cn("text-xs font-medium", confidenceConfig[confidence].className)}
        >
          {confidenceConfig[confidence].label}
        </Badge>
      </div>
    </div>
  );
}
