import { useEffect } from "react";

const SCROLL_SETTLE_MS = 160;

let mountedSparks = 0;

let settleTimeout: ReturnType<typeof setTimeout> | undefined;

const settle = () => {
  settleTimeout = undefined;
  delete document.documentElement.dataset.scrolling;
};

// Captures scrolling in any container, so the list viewport and the phone's
// document scroll both count. Only the attribute flips; nothing re-renders.
const onScroll = () => {
  if (settleTimeout === undefined)
    document.documentElement.dataset.scrolling = "";
  else clearTimeout(settleTimeout);

  settleTimeout = setTimeout(settle, SCROLL_SETTLE_MS);
};

/**
 * Marks the document as scrolling while any legendary embers are mounted,
 * which pauses them in `legendary-loot.css`. One listener serves every loot.
 */
export const usePauseSparksWhileScrolling = () => {
  useEffect(() => {
    mountedSparks += 1;

    if (mountedSparks === 1)
      document.addEventListener("scroll", onScroll, {
        capture: true,
        passive: true,
      });

    return () => {
      mountedSparks -= 1;

      if (mountedSparks > 0) return;

      document.removeEventListener("scroll", onScroll, { capture: true });
      clearTimeout(settleTimeout);
      settle();
    };
  }, []);
};
