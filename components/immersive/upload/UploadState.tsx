"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { MotionWrapper } from "../shared/MotionWrapper";
import { BackgroundCanvas } from "../entry/BackgroundCanvas";
import { DropZone } from "./DropZone";
import { FilePreviewNode } from "./FilePreviewNode";
import { PulseCheckButton } from "./PulseCheckButton";

interface UploadStateProps {
  onAnalyze: (file: File) => Promise<void>;
}

export function UploadState({ onAnalyze }: UploadStateProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [error, setError] = useState("");

  async function handleCheck() {
    if (!file) return;
    setError("");
    setLoading(true);

    try {
      setLoadingText("Uploading...");
      await onAnalyze(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setLoading(false);
    }
  }

  return (
    <MotionWrapper className="relative flex h-screen flex-col items-center justify-center px-4">
      <BackgroundCanvas />

      <div className="relative z-10 w-full max-w-md space-y-5">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Upload Resume
          </h2>
          <p className="text-sm text-white/40 mt-1">
            Drop your file to begin analysis
          </p>
        </div>

        <AnimatePresence mode="wait">
          {file ? (
            <FilePreviewNode
              key="preview"
              file={file}
              onRemove={() => setFile(null)}
            />
          ) : (
            <DropZone key="drop" onFileSelect={setFile} />
          )}
        </AnimatePresence>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs text-red-400">
            {error}
          </div>
        )}

        {file && (
          <PulseCheckButton
            onClick={handleCheck}
            loading={loading}
            loadingText={loadingText}
          />
        )}
      </div>
    </MotionWrapper>
  );
}
