"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload } from "lucide-react";

interface DropZoneProps {
  onFileSelect: (file: File) => void;
}

export function DropZone({ onFileSelect }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) onFileSelect(f);
    },
    [onFileSelect]
  );

  return (
    <motion.div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`
        group relative flex cursor-pointer flex-col items-center justify-center
        rounded-2xl border-2 border-dashed p-12 text-center transition-all
        ${dragOver
          ? "border-blue-400 bg-blue-500/5"
          : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelect(f);
        }}
      />

      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 mb-4 transition-colors group-hover:bg-white/10">
        <Upload className="h-6 w-6 text-white/40" />
      </div>

      <p className="text-sm font-medium text-white/70">
        Drag & drop your resume
      </p>
      <p className="text-xs text-white/30 mt-1">or click to browse</p>

      <div className="flex gap-2 mt-4">
        {["PDF", "DOCX", "TXT"].map((fmt) => (
          <span
            key={fmt}
            className="rounded-full bg-white/5 px-3 py-1 text-[10px] font-medium text-white/30"
          >
            {fmt}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
