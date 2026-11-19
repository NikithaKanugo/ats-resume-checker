"use client";

import { motion } from "framer-motion";

interface GlowButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function GlowButton({ children, onClick, disabled, className = "" }: GlowButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`
        relative rounded-2xl px-8 py-3 text-sm font-semibold
        bg-gradient-to-r from-blue-600 to-violet-600
        text-white shadow-lg shadow-blue-500/20
        transition-shadow hover:shadow-xl hover:shadow-blue-500/30
        disabled:opacity-40 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {/* Glow ring */}
      <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 to-violet-400 opacity-0 blur-xl transition-opacity group-hover:opacity-30" />
      <span className="relative">{children}</span>
    </motion.button>
  );
}
