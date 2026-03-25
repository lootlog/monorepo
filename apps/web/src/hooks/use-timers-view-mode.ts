import { useLocalStorage } from "usehooks-ts";

export type TimersViewMode = "list" | "grid";

const TIMERS_VIEW_MODE_KEY = "timers-view-mode";

export const useTimersViewMode = () => {
  const [viewMode, setViewMode] = useLocalStorage<TimersViewMode>(
    TIMERS_VIEW_MODE_KEY,
    "list",
  );

  return { viewMode, setViewMode };
};
