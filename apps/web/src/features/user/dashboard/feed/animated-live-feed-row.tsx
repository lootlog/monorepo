import * as m from "framer-motion/m";
import type { ComponentProps } from "react";
import { LiveFeedEventRow } from "./live-feed-event-row";

export function AnimatedLiveFeedRow({
  animateEntry = false,
  ...props
}: ComponentProps<typeof LiveFeedEventRow> & { animateEntry?: boolean }) {
  return (
    <m.li
      className="relative"
      initial={animateEntry ? { opacity: 0, y: -8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: animateEntry ? 0.22 : 0, ease: "easeOut" }}
    >
      <LiveFeedEventRow {...props} />
    </m.li>
  );
}
