"use client";

import { motion } from "framer-motion";
import { FileText, X } from "lucide-react";

interface FilePreviewNodeProps {
  file: File;
  onRemove: () => void;
}

export function FilePreviewNode({ file, onRemove }: FilePreviewNodeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
        <FileText className="h-5 w-5 text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/80 truncate">{file.name}</p>
        <p className="text-xs text-white/30">{(file.size / 1024).toFixed(0)} KB</p>
      </div>
      <button
        onClick={onRemove}
        className="rounded-full p-1.5 text-white/20 transition-colors hover:bg-white/5 hover:text-white/50"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
