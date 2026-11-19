"use client";

type Variant = "error" | "warning" | "success";

const styles: Record<Variant, string> = {
  error:   "bg-red-500/10 text-red-400 border-red-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

interface HighlightBadgeProps {
  variant: Variant;
  children: React.ReactNode;
}

export function HighlightBadge({ variant, children }: HighlightBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[variant]}`}>
      {children}
    </span>
  );
}
