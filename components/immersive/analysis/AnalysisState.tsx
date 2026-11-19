"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { MotionWrapper } from "../shared/MotionWrapper";

interface AnalysisStateProps {
  onComplete: () => void;
}

const SCAN_LABELS = [
  "Extracting text...",
  "Detecting sections...",
  "Evaluating structure...",
  "Scoring content quality...",
  "Compiling results...",
];

export function AnalysisState({ onComplete }: AnalysisStateProps) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <MotionWrapper className="relative flex h-screen flex-col items-center justify-center">
      {/* Scanning ring */}
      <div className="relative mb-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="h-24 w-24 rounded-full border-2 border-white/5 border-t-blue-500"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 rounded-full border-2 border-white/5 border-b-violet-500"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="absolute inset-0 m-auto h-4 w-4 rounded-full bg-blue-500"
        />
      </div>

      {/* Scan labels cycling */}
      <div className="h-6 overflow-hidden">
        <motion.div
          animate={{ y: [0, -24, -48, -72, -96] }}
          transition={{
            duration: 2.5,
            times: [0, 0.2, 0.4, 0.6, 0.8],
            ease: "easeInOut",
          }}
          className="flex flex-col items-center"
        >
          {SCAN_LABELS.map((label) => (
            <p key={label} className="h-6 text-sm text-white/40">
              {label}
            </p>
          ))}
        </motion.div>
      </div>

      {/* Progress bar */}
      <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-white/5">
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 2.6, ease: "easeInOut" }}
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500"
        />
      </div>
    </MotionWrapper>
  );
}
