import { cn } from "@/lib/utils";
import type { UIIssue, IssueSeverity } from "@/types/analysisUI";

interface ResumeSectionBlockProps {
  children: React.ReactNode;
  title?: string;
  issues?: UIIssue[];
  className?: string;
}

function highestSeverity(issues: UIIssue[]): IssueSeverity | null {
  if (issues.some((i) => i.severity === "critical")) return "critical";
  if (issues.some((i) => i.severity === "major")) return "major";
  if (issues.some((i) => i.severity === "minor")) return "minor";
  return null;
}

const blockBorder: Record<IssueSeverity, string> = {
  critical: "border-l-4 border-red-500 bg-red-50/40",
  major:    "border-l-4 border-orange-400 bg-orange-50/30",
  minor:    "border-l-4 border-yellow-400 bg-yellow-50/20",
};

const issueBadge: Record<IssueSeverity, string> = {
  critical: "bg-red-100 text-red-700",
  major:    "bg-orange-100 text-orange-700",
  minor:    "bg-yellow-100 text-yellow-700",
};

export function ResumeSectionBlock({
  children,
  title,
  issues = [],
  className,
}: ResumeSectionBlockProps) {
  const severity = highestSeverity(issues);

  return (
    <div
      className={cn(
        "rounded-md px-4 py-3 mb-3 transition-colors",
        severity ? blockBorder[severity] : "border-l-4 border-transparent",
        className
      )}
    >
      {title && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            {title}
          </span>
          {issues.map((issue) => (
            <span
              key={issue.id}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                issueBadge[issue.severity]
              )}
              title={issue.how_to_fix}
            >
              {issue.title}
            </span>
          ))}
        </div>
      )}
      {children}
    </div>
  );
}
