import * as m from "framer-motion/m";
import type { ComponentProps } from "react";
import { cn } from "cn";
import { LIST_TILE_RULE_CLASS } from "@/components/common/list-tile";
import { EASE_EMPHASIZED, MOTION_DURATION } from "@/lib/motion";
import { LiveFeedEventRow } from "./live-feed-event-row";

export function AnimatedLiveFeedRow({
  animateEntry = false,
  ...props
}: ComponentProps<typeof LiveFeedEventRow> & { animateEntry?: boolean }) {
  return (
    <m.li
      className={cn(
        LIST_TILE_RULE_CLASS,
        animateEntry && "animate-arrival motion-reduce:animate-none",
      )}
      initial={animateEntry ? { opacity: 0, y: -8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: animateEntry ? MOTION_DURATION.medium : 0,
        ease: EASE_EMPHASIZED,
      }}
    >
      <LiveFeedEventRow {...props} />
    </m.li>
  );
}
