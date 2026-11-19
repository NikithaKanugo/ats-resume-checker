"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface PulseCheckButtonProps {
  onClick: () => void;
  loading: boolean;
  loadingText?: string;
}

export function PulseCheckButton({ onClick, loading, loadingText }: PulseCheckButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={loading}
      whileHover={loading ? {} : { scale: 1.03 }}
      whileTap={loading ? {} : { scale: 0.97 }}
      className="relative w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-shadow hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {/* Pulse ring when idle */}
      {!loading && (
        <motion.span
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-2xl border-2 border-blue-400/30"
        />
      )}

      <span className="relative flex items-center justify-center gap-2">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {loadingText ?? "Processing..."}
          </>
        ) : (
          "Check Resume"
        )}
      </span>
    </motion.button>
  );
}
