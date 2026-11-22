import { useLocalStorage, useMediaQuery } from "usehooks-ts";

export type ViewMode = "list" | "grid";

const ALWAYS = "all";

export const useViewMode = (
  storageKey: string,
  defaultValue: ViewMode = "grid",
  gridMediaQuery: string = ALWAYS,
  narrowViewMode: ViewMode = "list",
) => {
  const [storedViewMode, setViewMode] = useLocalStorage<ViewMode>(
    storageKey,
    defaultValue,
  );

  const canChooseViewMode = useMediaQuery(gridMediaQuery);

  return {
    viewMode: canChooseViewMode ? storedViewMode : narrowViewMode,
    setViewMode,
    canChooseViewMode,
  };
};
