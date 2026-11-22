import { useLayoutEffect, useRef } from "react";

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
