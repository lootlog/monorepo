import { useLocalStorage } from "usehooks-ts";

export type LootsViewMode = "list" | "grid";

const LOOTS_VIEW_MODE_KEY = "loots-view-mode";

export const useLootsViewMode = () => {
  const [viewMode, setViewMode] = useLocalStorage<LootsViewMode>(
    LOOTS_VIEW_MODE_KEY,
    "grid",
  );

  return { viewMode, setViewMode };
};
