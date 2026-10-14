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

/** Transparent, so a theme's wallpaper shows through as it does behind rows. */
export const TIMER_GROUP_HEADING_CLASS =
  "flex h-9 items-center gap-2 border-b border-sidebar-border text-xs font-semibold text-muted-foreground";
