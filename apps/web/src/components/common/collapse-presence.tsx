import type { ReactNode } from "react";
import { AnimatePresence } from "framer-motion";
import * as m from "framer-motion/m";
import { cn } from "cn";
import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";
import { EASE_EMPHASIZED, MOTION_DURATION } from "@/lib/motion";

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
              : { duration: MOTION_DURATION.long, ease: EASE_EMPHASIZED }
          }
          className={cn("grid", className)}
        >
          <div className="min-h-0 min-w-0 overflow-hidden">{children}</div>
        </m.div>
      )}
    </AnimatePresence>
  );
};
