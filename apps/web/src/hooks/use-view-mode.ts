import { useLocalStorage } from "usehooks-ts";

export type ViewMode = "list" | "grid";

export const useViewMode = (
  storageKey: string,
  defaultValue: ViewMode = "grid",
) => {
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>(
    storageKey,
    defaultValue,
  );

  return { viewMode, setViewMode };
};
