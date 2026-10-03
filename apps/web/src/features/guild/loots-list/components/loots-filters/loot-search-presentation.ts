import type { Variants } from "framer-motion";
import type { ReactNode } from "react";

export const containerVariants: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.12 },
  },
};

export const allTrue = (...values: boolean[]) => values.every(Boolean);

export const anyTrue = (...values: boolean[]) => values.some(Boolean);

export const renderIf = (condition: boolean, content: ReactNode) =>
  condition ? content : null;
