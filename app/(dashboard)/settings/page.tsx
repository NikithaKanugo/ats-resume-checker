export default function SettingsPage() {
  return (
    <div className="px-8 py-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Application preferences and configuration.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-card space-y-4">
        <h2 className="text-sm font-semibold">Scoring Engine</h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          The scoring engine uses a deterministic rule-based approach with four categories:
          Parseability (30%), Structure (30%), Content Quality (40%).
          When a Job Description is provided, JD Match (40%) is included
          and other weights adjust accordingly.
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card p-6 shadow-card">
        <p className="text-xs text-muted-foreground text-center">
          More settings coming soon: theme preferences, scoring weights, export options.
        </p>
      </div>
    </div>
  );
}
