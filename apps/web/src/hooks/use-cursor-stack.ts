import { useState } from "react";

/**
 * Back-and-forth paging over an API that only returns `nextCursor`: keeps the
 * cursors of the pages already visited. A cursor is valid only for the filters
 * and sort it was issued for, so any change of `resetKey` returns to the first
 * page.
 */
export const useCursorStack = (resetKey: string) => {
  const [state, setState] = useState<{
    resetKey: string;
    cursors: readonly string[];
  }>({ resetKey, cursors: [] });

  // Resetting while rendering keeps a stale cursor out of the next request.
  if (state.resetKey !== resetKey) setState({ resetKey, cursors: [] });

  const cursors = state.resetKey === resetKey ? state.cursors : [];

  return {
    /** The cursor of the current page; undefined on the first page. */
    cursor: cursors[cursors.length - 1],
    /** Zero-based index of the current page. */
    pageIndex: cursors.length,
    hasPrev: cursors.length > 0,
    goToNext: (nextCursor: string) =>
      setState({ resetKey, cursors: [...cursors, nextCursor] }),
    goToPrevious: () => setState({ resetKey, cursors: cursors.slice(0, -1) }),
  };
};
