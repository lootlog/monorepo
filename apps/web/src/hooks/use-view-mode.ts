import { useLocalStorage, useMediaQuery } from "usehooks-ts";

export type ViewMode = "list" | "grid";

const ALWAYS = "all";

/**
 * Pass `gridMediaQuery` when the grid differs from the list only by its
 * columns: below it the grid has one column, so the page shows the list and
 * hides the switch; the stored choice returns once the window is wide enough.
 */
export const useViewMode = (
  storageKey: string,
  defaultValue: ViewMode = "grid",
  gridMediaQuery: string = ALWAYS,
) => {
  const [storedViewMode, setViewMode] = useLocalStorage<ViewMode>(
    storageKey,
    defaultValue,
  );

  const canChooseViewMode = useMediaQuery(gridMediaQuery);

  return {
    viewMode: canChooseViewMode ? storedViewMode : ("list" as const),
    setViewMode,
    canChooseViewMode,
  };
};
