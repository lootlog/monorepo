import { useEffect, type RefObject } from "react";
import { getPrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

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

      // The table may scroll on its own or with an ancestor column, so let the browser pick.
      row.scrollIntoView({
        block: "center",
        behavior: getPrefersReducedMotion() ? "auto" : "smooth",
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [viewportRef, searchKey, searchQuery, categories]);
}
