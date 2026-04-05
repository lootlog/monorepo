import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/utils/cn";

interface AnimatedPanelProps {
  children: React.ReactNode;
  className: string;
  delay?: number;
  shimmer?: boolean;
}

export const AnimatedPanel = ({
  children,
  className,
  delay = 0,
  shimmer = false,
}: AnimatedPanelProps) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={
        prefersReducedMotion ? false : { opacity: 0, y: 24, scale: 0.985 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={
        prefersReducedMotion
          ? { duration: 0.18 }
          : {
              duration: 0.3,
              delay,
              ease: [0.22, 1, 0.36, 1],
            }
      }
      className={cn("relative overflow-hidden", className)}
    >
      {shimmer && !prefersReducedMotion ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.14),transparent)]"
          animate={{ x: ["-10%", "340%"] }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            repeatDelay: 1.8,
            ease: "easeInOut",
            delay,
          }}
        />
      ) : null}
      {children}
    </motion.div>
  );
};
