import { useLayoutEffect, useRef } from "react";

/**
 * Publishes the height of a table's pinned title and search as `--battle-stats-pinned-height`
 * on the card, so the column header can stick right below them. The height changes when the
 * title or the actions wrap.
 */
export function useBattleStatsPinnedHeader(enabled: boolean) {
  const cardRef = useRef<HTMLDivElement>(null);
  const pinnedHeaderRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const card = cardRef.current;
    const header = pinnedHeaderRef.current;

    if (!enabled || !card || !header) return;

    const updatePinnedHeight = () => {
      card.style.setProperty(
        "--battle-stats-pinned-height",
        `${Math.ceil(header.getBoundingClientRect().height)}px`,
      );
    };

    updatePinnedHeight();
    const observer = new ResizeObserver(updatePinnedHeight);
    observer.observe(header);

    return () => observer.disconnect();
  });

  return { cardRef, pinnedHeaderRef };
}
