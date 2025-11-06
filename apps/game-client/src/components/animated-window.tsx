import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";

const WINDOW_ANIMATION = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 4 },
  transition: {
    type: "spring" as const,
    stiffness: 500,
    damping: 30,
    duration: 0.15,
  },
};

interface AnimatedWindowProps {
  isOpen: boolean;
  windowKey: string;
  children: ReactNode;
}

export const AnimatedWindow = ({
  isOpen,
  windowKey,
  children,
}: AnimatedWindowProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key={windowKey}
          initial={WINDOW_ANIMATION.initial}
          animate={WINDOW_ANIMATION.animate}
          exit={WINDOW_ANIMATION.exit}
          transition={WINDOW_ANIMATION.transition}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
