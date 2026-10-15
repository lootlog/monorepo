import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { cn } from "cn";
import type { ReactNode } from "react";
import { SCHEDULE_BAR_HEIGHT } from "./constants";

type ScheduleBarProps = {
  isCompact: boolean;
  children: ReactNode;
};

/**
 * The schedule's first row, styled as a list toolbar. It stays on top while
 * the hours scroll, so it belongs directly in the page scroller marked
 * `data-under-top-bar`.
 */
export const ScheduleBar = ({ isCompact, children }: ScheduleBarProps) => (
  <header
    data-list-tile
    className={cn(
      "sticky top-(--page-sticky-top) z-10 flex items-center backdrop-blur-sm",
      isCompact ? "gap-1" : "gap-2",
      LIST_TILE_RULE_CLASS,
      LIST_TILE_INSET_CLASS,
    )}
    style={{ height: SCHEDULE_BAR_HEIGHT }}
  >
    {children}
  </header>
);
