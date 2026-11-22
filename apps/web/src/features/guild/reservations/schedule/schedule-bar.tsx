import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { cn } from "cn";
import type { ReactNode } from "react";
import { SCHEDULE_BAR_HEIGHT } from "./constants";
import { observeTopBarGlass } from "@/components/layout/observe-top-bar-glass";

type ScheduleBarProps = {
  isCompact: boolean;
  children: ReactNode;
};

export const ScheduleBar = ({ isCompact, children }: ScheduleBarProps) => (
  <header
    data-list-tile
    ref={observeTopBarGlass}
    className={cn(
      "glass-bar sticky top-(--page-sticky-top) z-10 flex items-center",
      isCompact ? "gap-1" : "gap-2",
      LIST_TILE_RULE_CLASS,
      LIST_TILE_INSET_CLASS,
    )}
    style={{ height: SCHEDULE_BAR_HEIGHT }}
  >
    {children}
  </header>
);
