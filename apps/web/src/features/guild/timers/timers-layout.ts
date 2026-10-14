import type { ViewMode } from "@/hooks/use-view-mode";
import {
  LIST_TILE_GRID_CELL_CLASS,
  LIST_TILE_GRID_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { cn } from "cn";

export const TIMERS_VIEW_MODE_KEY = "timers-view-mode";

/** Tailwind `lg`, where the timer grid gets its second column. */
export const TIMERS_GRID_MEDIA_QUERY = "(min-width: 64rem)";

/** Timer rows and skeleton rows share the group and cell classes. */
export const getTimerGroupClassName = (viewMode: ViewMode) =>
  viewMode === "grid"
    ? cn(LIST_TILE_GRID_CLASS, "lg:grid-cols-2 2xl:grid-cols-3")
    : "flex flex-col";

export const getTimerCellClassName = (viewMode: ViewMode) =>
  viewMode === "grid" ? LIST_TILE_GRID_CELL_CLASS : LIST_TILE_RULE_CLASS;
