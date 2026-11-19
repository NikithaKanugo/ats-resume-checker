"use client";

import { motion } from "framer-motion";

interface StartOrbProps {
  onClick: () => void;
}

export function StartOrb({ onClick }: StartOrbProps) {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.7, duration: 0.5, type: "spring", stiffness: 200 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className="group relative mt-10"
    >
      {/* Outer glow pulse */}
      <motion.span
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-violet-500 blur-xl"
      />

      {/* Button surface */}
      <span className="relative flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-8 py-3.5 text-sm font-semibold text-white shadow-2xl shadow-blue-500/30 transition-shadow group-hover:shadow-blue-500/50">
        <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
        Start Checking
      </span>
    </motion.button>
  );
}
