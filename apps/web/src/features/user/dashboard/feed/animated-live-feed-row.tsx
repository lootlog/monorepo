import { motion, useReducedMotion } from "framer-motion";
import type { ComponentProps } from "react";
import { LiveFeedRow } from "./live-feed-row";

export function AnimatedLiveFeedRow({
  animateEntry = false,
  ...props
}: ComponentProps<typeof LiveFeedRow> & { animateEntry?: boolean }) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animateEntry && !reducedMotion;
  const expandDuration = shouldAnimate ? 0.22 : 0;
  return (
    <motion.li
      className="border-t border-border/50 first:border-t-0 odd:bg-card even:bg-muted/60"
      initial={shouldAnimate ? { height: 0, overflow: "hidden" } : false}
      animate={{ height: "auto", overflow: "visible" }}
      transition={{
        height: { duration: expandDuration, ease: "easeOut" },
        overflow: { delay: expandDuration },
      }}
    >
      <motion.div
        initial={shouldAnimate ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{
          delay: expandDuration,
          duration: shouldAnimate ? 0.16 : 0,
        }}
      >
        <LiveFeedRow {...props} />
      </motion.div>
    </motion.li>
  );
}
