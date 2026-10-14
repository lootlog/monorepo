import type { ViewMode } from "@/hooks/use-view-mode";

export const TIMERS_VIEW_MODE_KEY = "timers-view-mode";

/** Tailwind `lg`, where the timer grid gets its second column. */
export const TIMERS_GRID_MEDIA_QUERY = "(min-width: 64rem)";

/**
 * Timers tile each group edge to edge, one hairline between neighbours, as
 * loots do. The grid overhangs its clipping wrapper by a pixel so the last
 * column's right rule disappears. Rows and skeleton rows share these classes.
 */
export const getTimerGroupClassName = (viewMode: ViewMode) =>
  viewMode === "grid"
    ? "-mr-px grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3"
    : "flex flex-col";

export const getTimerCellClassName = (viewMode: ViewMode) =>
  viewMode === "grid"
    ? "border-b border-sidebar-border lg:border-r"
    : "border-b border-sidebar-border";

/** Horizontal inset shared by timer rows and group headings. */
export const TIMER_ROW_INSET_CLASS = "px-3 sm:px-4";

export const TIMER_GROUP_HEADING_CLASS =
  "sticky top-0 z-10 flex h-9 items-center gap-2 border-b border-sidebar-border bg-background/90 text-xs font-semibold text-muted-foreground backdrop-blur-sm";
