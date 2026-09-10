import { useReducedMotion } from "framer-motion";
import * as m from "framer-motion/m";
import type { ComponentProps } from "react";
import { LiveFeedRow } from "./live-feed-row";

export function AnimatedLiveFeedRow({
  animateEntry = false,
  ...props
}: ComponentProps<typeof LiveFeedRow> & { animateEntry?: boolean }) {
  const reducedMotion = useReducedMotion();
  const shouldAnimate = animateEntry && !reducedMotion;
  return (
    <m.li
      className="border-t border-border/50 first:border-t-0 odd:bg-card even:bg-muted/60"
      initial={shouldAnimate ? { opacity: 0, y: -8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: shouldAnimate ? 0.22 : 0, ease: "easeOut" }}
    >
      <LiveFeedRow {...props} />
    </m.li>
  );
}
