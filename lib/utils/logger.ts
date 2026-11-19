/**
 * logger.ts
 *
 * Minimal structured JSON logger for server-side pipeline events.
 * Outputs one JSON line per event to stdout/stderr.
 *
 * Usage:
 *   log.info("parse_complete", { sections: 5, confidence: "high" });
 *   log.warn("missing_dates", { entry: 0 });
 *   log.error("extraction_failed", { format: "pdf", error: err.message });
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  event: string;
  ts: string;
  [key: string]: unknown;
}

function emit(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
  const entry: LogEntry = {
    level,
    event,
    ts: new Date().toISOString(),
    ...data,
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

export const log = {
  info: (event: string, data?: Record<string, unknown>) => emit("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => emit("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => emit("error", event, data),
};
