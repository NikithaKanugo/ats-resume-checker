/**
 * POST /api/upload
 *
 * Accepts a multipart/form-data request with a "file" field.
 * Validates the file type, stores the buffer in the upload store,
 * and returns an upload_id for use in the /api/analyze request.
 *
 * No business logic lives here.
 */

import { NextRequest } from "next/server";
import { generateId, nowIso } from "@/lib/utils/textUtils";
import { saveUpload } from "@/lib/utils/uploadStore";
import { ok, err } from "@/lib/utils/apiResponse";
import { log } from "@/lib/utils/logger";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "doc", "txt"]);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  let formData: FormData;

  try {
    formData = await req.formData();
  } catch {
    return err("Request must be multipart/form-data.", 400, "INVALID_CONTENT_TYPE");
  }

  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return err('A "file" field is required.', 400, "MISSING_FILE");
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return err(
      `File exceeds the 10 MB limit (received ${(file.size / 1024 / 1024).toFixed(1)} MB).`,
      413,
      "FILE_TOO_LARGE"
    );
  }

  // Validate file type by MIME type and extension
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED_TYPES.has(file.type) && !ALLOWED_EXTENSIONS.has(ext)) {
    return err(
      `Unsupported file type "${file.type}". Upload a PDF, DOCX, or TXT file.`,
      415,
      "UNSUPPORTED_FILE_TYPE"
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    log.error("upload_buffer_read_failed", { filename: file.name });
    return err("Failed to read file data.", 500, "FILE_READ_ERROR");
  }

  const uploadId = generateId();
  saveUpload(uploadId, buffer, file.name);

  log.info("upload_complete", {
    upload_id: uploadId,
    filename: file.name,
    size_bytes: file.size,
  });

  return ok({
    upload_id: uploadId,
    filename: file.name,
    size_bytes: file.size,
    uploaded_at: nowIso(),
  }, 201);
}
