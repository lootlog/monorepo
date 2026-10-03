import type { ViewMode } from "@/hooks/use-view-mode";

export const TIMERS_VIEW_MODE_KEY = "timers-view-mode";

/** Timer rows and their skeletons share one collection layout per view mode. */
export const getTimerGroupClassName = (viewMode: ViewMode) =>
  viewMode === "grid"
    ? "grid grid-cols-1 gap-1.5 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    : "flex flex-col gap-1.5";
