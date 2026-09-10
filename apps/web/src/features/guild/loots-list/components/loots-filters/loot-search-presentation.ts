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

export const getRarityStyle = (rarity: string | null) => {
  switch (rarity) {
    case "LEGENDARY":
      return "text-orange-400";
    case "HEROIC":
      return "text-blue-500";
    case "UNIQUE":
      return "text-amber-300";
    case "UPGRADED":
      return "text-primary";
    default:
      return "text-muted-foreground";
  }
};

export const allTrue = (...values: boolean[]) => values.every(Boolean);

export const anyTrue = (...values: boolean[]) => values.some(Boolean);

export const renderIf = (condition: boolean, content: ReactNode) =>
  condition ? content : null;
