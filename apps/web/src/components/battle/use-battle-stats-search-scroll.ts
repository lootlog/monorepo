import { useEffect, type RefObject } from "react";

const STAT_SEARCH_SCROLL_OFFSET_PX = 40;

export function useBattleStatsSearchScroll({
  viewportRef,
  searchKey,
  searchQuery,
  categories,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  searchKey: string | null;
  searchQuery: string;
  categories: readonly { id: string }[];
}) {
  useEffect(() => {
    if (!searchKey) return;
    const frame = requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const row = Array.from(
        viewport.querySelectorAll<HTMLElement>("[data-battle-stat-search-key]"),
      ).find(
        (candidate) => candidate.dataset.battleStatSearchKey === searchKey,
      );
      if (!row) return;
      const top =
        viewport.scrollTop +
        row.getBoundingClientRect().top -
        viewport.getBoundingClientRect().top -
        STAT_SEARCH_SCROLL_OFFSET_PX;
      viewport.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [viewportRef, searchKey, searchQuery, categories]);
}
