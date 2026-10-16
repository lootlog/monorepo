import { useLocalStorage, useMediaQuery } from "usehooks-ts";

export type ViewMode = "list" | "grid";

const ALWAYS = "all";

/**
 * Pass `gridMediaQuery` when below it the grid has one column: the page then
 * shows `narrowViewMode` and hides the switch; the stored choice returns once
 * the window is wide enough. Keep the list as the narrow mode when the grid
 * differs from it only by its columns, and the grid when its tiles show more.
 */
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
