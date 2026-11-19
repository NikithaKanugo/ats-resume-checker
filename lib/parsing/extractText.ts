/**
 * extractText.ts
 *
 * Converts a raw file buffer into a plain text string.
 * All format-specific logic is isolated here.
 *
 * PDF  → pdf-parse (real extraction, async)
 * DOCX → mammoth  (real extraction, async)
 * TXT  → UTF-8 decode (sync, wrapped in async for uniform interface)
 */

import { log } from "../utils/logger";

export type FileFormat = "pdf" | "docx" | "txt" | "unknown";

export function detectFormat(filename: string): FileFormat {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":  return "pdf";
    case "docx":
    case "doc":  return "docx";
    case "txt":  return "txt";
    default:     return "unknown";
  }
}

/**
 * Extract plain text from a file buffer.
 * Always async — callers should await regardless of format.
 *
 * @throws {ExtractionError} for unsupported formats or extraction failures
 */
export async function extractText(
  buffer: Buffer,
  format: FileFormat
): Promise<string> {
  log.info("extraction_start", { format, buffer_size: buffer.length });

  switch (format) {
    case "txt":     return extractFromTxt(buffer);
    case "pdf":     return extractFromPdf(buffer);
    case "docx":    return extractFromDocx(buffer);
    case "unknown":
      log.error("extraction_unsupported", { format });
      throw new ExtractionError(
        "Unsupported file format. Please upload a PDF, DOCX, or TXT file."
      );
  }
}

// ---------------------------------------------------------------------------
// Format extractors
// ---------------------------------------------------------------------------

function extractFromTxt(buffer: Buffer): string {
  const text = buffer.toString("utf-8");
  if (!text.trim()) {
    throw new ExtractionError("The uploaded text file appears to be empty.");
  }
  return text;
}

async function extractFromPdf(buffer: Buffer): Promise<string> {
  // Dynamic import avoids pdf-parse loading its test fixture at module init,
  // which causes errors in Next.js server environments.
  // Import the core file directly to avoid pdf-parse loading its test fixture,
  // which throws in Next.js server environments.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (buf: Buffer) => Promise<{ text: string }>;
  try {
    const result = await pdfParse(buffer);
    const text = result.text?.trim();
    if (!text) {
      throw new ExtractionError(
        "No text could be extracted from this PDF. It may be image-based or password-protected."
      );
    }
    return text;
  } catch (e) {
    if (e instanceof ExtractionError) throw e;
    throw new ExtractionError(
      `PDF extraction failed: ${e instanceof Error ? e.message : "unknown error"}`
    );
  }
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value?.trim();
    if (!text) {
      throw new ExtractionError(
        "No text could be extracted from this DOCX file. It may be empty or corrupted."
      );
    }
    return text;
  } catch (e) {
    if (e instanceof ExtractionError) throw e;
    throw new ExtractionError(
      `DOCX extraction failed: ${e instanceof Error ? e.message : "unknown error"}`
    );
  }
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractionError";
  }
}
