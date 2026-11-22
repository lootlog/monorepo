import { useState } from "react";

export const useCursorStack = (resetKey: string) => {
  const [state, setState] = useState<{
    resetKey: string;
    cursors: readonly string[];
  }>({ resetKey, cursors: [] });

  if (state.resetKey !== resetKey) setState({ resetKey, cursors: [] });

  const cursors = state.resetKey === resetKey ? state.cursors : [];

  return {
    cursor: cursors[cursors.length - 1],
    pageIndex: cursors.length,
    hasPrev: cursors.length > 0,
    goToNext: (nextCursor: string) =>
      setState({ resetKey, cursors: [...cursors, nextCursor] }),
    goToPrevious: () => setState({ resetKey, cursors: cursors.slice(0, -1) }),
  };
};
