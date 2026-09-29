import type { ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
import { cn } from "cn";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

type CollapseAxis = "vertical" | "horizontal";

const collapsedTrack = {
  vertical: { gridTemplateRows: "0fr", opacity: 0 },
  horizontal: { gridTemplateColumns: "0fr", opacity: 0 },
} as const;

const expandedTrack = {
  vertical: { gridTemplateRows: "1fr", opacity: 1 },
  horizontal: { gridTemplateColumns: "1fr", opacity: 1 },
} as const;

interface CollapsePresenceProps {
  open: boolean;
  axis?: CollapseAxis;
  className?: string;
  children: ReactNode;
}

/**
 * Mounts and unmounts content while growing or shrinking the space it takes,
 * so neighbouring content slides instead of jumping. The grid track animates
 * from `0fr` to `1fr`, which follows the content's natural size.
 */
export const CollapsePresence = ({
  open,
  axis = "vertical",
  className,
  children,
}: CollapsePresenceProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open && (
        <m.div
          initial={collapsedTrack[axis]}
          animate={expandedTrack[axis]}
          exit={collapsedTrack[axis]}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }
          }
          className={cn("grid", className)}
        >
          <div className="min-h-0 min-w-0 overflow-hidden">{children}</div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
