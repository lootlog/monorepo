import {
  getNextBattlePanelPage,
  getPreviousBattlePanelPage,
} from "../battle-panel-search";

export const createBattlePanelCursorActions = (
  pagination:
    | { nextCursor?: string | null; previousCursor?: string | null }
    | undefined,
  page: number,
  change: (state: { cursor: string; page: number }) => unknown,
) => {
  const move = (direction: "next" | "previous") => {
    const cursor =
      direction === "next"
        ? pagination?.nextCursor
        : pagination?.previousCursor;
    if (cursor)
      void change({
        cursor,
        page:
          direction === "next"
            ? getNextBattlePanelPage(page)
            : getPreviousBattlePanelPage(page),
      });
  };
  return {
    handleNextPage: () => move("next"),
    handlePreviousPage: () => move("previous"),
  };
};
