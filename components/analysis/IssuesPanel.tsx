"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { UIIssue, IssueSeverity } from "@/types/analysisUI";

interface IssuesPanelProps {
  issues: UIIssue[];
}

const severityOrder: IssueSeverity[] = ["critical", "major", "minor"];

const severityConfig: Record<IssueSeverity, {
  label: string;
  icon: React.ElementType;
  badgeClass: string;
  iconClass: string;
}> = {
  critical: {
    label: "Critical",
    icon: AlertCircle,
    badgeClass: "bg-red-100 text-red-700 border-red-200",
    iconClass: "text-red-500",
  },
  major: {
    label: "Major",
    icon: AlertTriangle,
    badgeClass: "bg-orange-100 text-orange-700 border-orange-200",
    iconClass: "text-orange-500",
  },
  minor: {
    label: "Minor",
    icon: Info,
    badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-200",
    iconClass: "text-yellow-600",
  },
};

function IssueRow({ issue }: { issue: UIIssue }) {
  const [open, setOpen] = useState(false);
  const { icon: Icon, badgeClass, iconClass } = severityConfig[issue.severity];

  return (
    <div className="rounded-md border border-slate-100 bg-white overflow-hidden">
      <button
        className="flex w-full items-start gap-3 p-3 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", iconClass)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-800">{issue.title}</span>
            <Badge variant="outline" className={cn("text-[10px] font-semibold px-1.5", badgeClass)}>
              -{issue.score_impact} pts
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{issue.what_we_found}</p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
        )}
      </button>
      {open && (
        <div className="border-t border-slate-100 px-3 pb-3 pt-2 text-xs space-y-2">
          <div>
            <span className="font-semibold text-slate-600">What we found: </span>
            <span className="text-slate-600">{issue.what_we_found}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-600">How to fix: </span>
            <span className="text-slate-600">{issue.how_to_fix}</span>
          </div>
          {issue.target_section && (
            <div className="flex items-center gap-1">
              <span className="font-semibold text-slate-500">Section:</span>
              <code className="rounded bg-slate-100 px-1 text-slate-500">{issue.target_section}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function IssuesPanel({ issues }: IssuesPanelProps) {
  const grouped = severityOrder
    .map((sev) => ({ sev, items: issues.filter((i) => i.severity === sev) }))
    .filter(({ items }) => items.length > 0);

  if (issues.length === 0) {
    return <p className="text-sm text-slate-400 italic">No issues detected.</p>;
  }

  return (
    <div className="space-y-4">
      {grouped.map(({ sev, items }, idx) => {
        const { label, badgeClass } = severityConfig[sev];
        return (
          <div key={sev}>
            {idx > 0 && <Separator className="mb-4" />}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {label}
              </span>
              <Badge variant="outline" className={cn("text-[10px] font-semibold", badgeClass)}>
                {items.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {items.map((issue) => (
                <IssueRow key={issue.id} issue={issue} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
