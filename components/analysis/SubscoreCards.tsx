import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { UISubscores } from "@/types/analysisUI";

interface SubscoreCardsProps {
  subscores: UISubscores;
}

interface ScoreCardDef {
  key: keyof UISubscores;
  label: string;
  weight: string;
}

const CARDS: ScoreCardDef[] = [
  { key: "parseability",    label: "Parseability",    weight: "30%" },
  { key: "structure",       label: "Structure",       weight: "30%" },
  { key: "content_quality", label: "Content Quality", weight: "40%" },
  { key: "jd_match",        label: "JD Match",        weight: "—"   },
];

function barColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-blue-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function scoreText(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-blue-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

export function SubscoreCards({ subscores }: SubscoreCardsProps) {
  const active = CARDS.filter(
    (c) => c.key !== "jd_match" || subscores.jd_match !== null
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      {active.map(({ key, label, weight }) => {
        const raw = subscores[key];
        const score = raw ?? 0;
        const isNull = raw === null;

        return (
          <div
            key={key}
            className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm"
          >
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-slate-500">{label}</p>
              <span className="text-[10px] text-slate-400">{weight}</span>
            </div>
            {isNull ? (
              <p className="text-xs text-slate-400 italic">Not evaluated</p>
            ) : (
              <>
                <p className={cn("text-xl font-bold tabular-nums", scoreText(score))}>
                  {score}
                  <span className="text-xs font-normal text-slate-400 ml-0.5">/100</span>
                </p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", barColor(score))}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
