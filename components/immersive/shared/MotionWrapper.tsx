"use client";

import { motion, type Variants } from "framer-motion";

const pageVariants: Variants = {
  initial: { opacity: 0, scale: 0.96, filter: "blur(8px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit:    { opacity: 0, scale: 1.02, filter: "blur(6px)" },
};

interface MotionWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function MotionWrapper({ children, className }: MotionWrapperProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
