"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, X, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SubmitState = "idle" | "uploading" | "analyzing" | "error";

export default function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const isReady = file !== null || rawText.trim().length >= 50;
  const isLoading = state === "uploading" || state === "analyzing";

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      setRawText("");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");

    try {
      if (file) {
        await submitFile(file);
      } else {
        await submitRawText(rawText);
      }
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function submitFile(f: File) {
    setState("uploading");
    const formData = new FormData();
    formData.append("file", f);

    const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
    if (!uploadRes.ok) {
      const body = await uploadRes.json();
      throw new Error(body.error ?? "Upload failed.");
    }

    const { upload_id } = await uploadRes.json();
    await runAnalysis({ resume_upload_id: upload_id });
  }

  async function submitRawText(text: string) {
    await runAnalysis({ raw_text: text });
  }

  async function runAnalysis(payload: object) {
    setState("analyzing");
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error ?? "Analysis failed.");
    }
    const result = await res.json();
    router.push(`/results/${result.analysis_id}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Upload Resume</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-8">
        Upload a PDF or DOCX file, or paste your resume text below.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-all",
            dragOver
              ? "border-primary bg-primary/5"
              : file
                ? "border-primary/30 bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-muted/50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              if (f) setRawText("");
            }}
          />

          {file ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="ml-2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                Drag & drop your resume here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                or click to browse
              </p>
              <div className="flex gap-2 mt-3">
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  PDF
                </span>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  DOCX
                </span>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  TXT
                </span>
              </div>
            </>
          )}
        </div>

        {/* Divider */}
        {!file && (
          <>
            <div className="flex items-center gap-3">
              <hr className="flex-1 border-border" />
              <span className="text-xs text-muted-foreground">or paste text</span>
              <hr className="flex-1 border-border" />
            </div>

            <textarea
              rows={8}
              placeholder="Paste your resume text here (min 50 characters)..."
              className="w-full rounded-xl border border-border bg-card p-4 text-sm leading-relaxed placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all resize-none"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!isReady || isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {state === "uploading" ? "Uploading..." : "Analyzing..."}
            </>
          ) : (
            "Analyze Resume"
          )}
        </button>
      </form>
    </div>
  );
}
