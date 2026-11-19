import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { IssueSeverity } from "@/types/analysisUI";

interface PenaltyHighlightProps {
  children: React.ReactNode;
  severity: IssueSeverity;
  label: string;
  detail?: string;
  inline?: boolean;
}

const severityStyles: Record<IssueSeverity, string> = {
  critical: "bg-red-50 border-l-4 border-red-500 text-red-900",
  major:    "bg-orange-50 border-l-4 border-orange-400 text-orange-900",
  minor:    "bg-yellow-50 border-l-4 border-yellow-400 text-yellow-900",
};

const badgeStyles: Record<IssueSeverity, string> = {
  critical: "bg-red-100 text-red-700 border border-red-200",
  major:    "bg-orange-100 text-orange-700 border border-orange-200",
  minor:    "bg-yellow-100 text-yellow-700 border border-yellow-200",
};

export function PenaltyHighlight({
  children,
  severity,
  label,
  detail,
  inline = false,
}: PenaltyHighlightProps) {
  const content = (
    <div
      className={cn(
        "relative rounded-r-md px-3 py-2 my-1",
        severityStyles[severity]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 text-sm">{children}</div>
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            badgeStyles[severity]
          )}
        >
          {severity}
        </span>
      </div>
      <p className="mt-1 text-xs font-medium opacity-70">{label}</p>
    </div>
  );

  if (inline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "rounded px-0.5 underline decoration-dotted cursor-help",
                severity === "critical" && "bg-red-100 text-red-800",
                severity === "major" && "bg-orange-100 text-orange-800",
                severity === "minor" && "bg-yellow-100 text-yellow-800"
              )}
            >
              {children}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-semibold">{label}</p>
            {detail && <p className="mt-1 text-xs opacity-80">{detail}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-semibold">{label}</p>
          {detail && <p className="mt-1 text-xs opacity-80">{detail}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
