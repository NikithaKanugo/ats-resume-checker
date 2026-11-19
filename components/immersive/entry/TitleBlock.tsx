"use client";

import { motion } from "framer-motion";

export function TitleBlock() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.6 }}
      className="text-center"
    >
      <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
        <span className="bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
          ATS Resume
        </span>
        <br />
        <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
          Score Checker
        </span>
      </h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mt-4 text-sm text-white/40 max-w-sm mx-auto leading-relaxed"
      >
        Upload your resume. Get instant ATS scoring, rule-based analysis, and actionable fixes.
      </motion.p>
    </motion.div>
  );
}
