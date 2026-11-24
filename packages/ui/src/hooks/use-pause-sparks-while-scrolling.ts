import { useEffect } from "react";

const SCROLL_SETTLE_MS = 160;

let mountedSparks = 0;

let settleTimeout: ReturnType<typeof setTimeout> | undefined;

const settle = () => {
  settleTimeout = undefined;
  delete document.documentElement.dataset.scrolling;
};

const onScroll = () => {
  if (settleTimeout === undefined)
    document.documentElement.dataset.scrolling = "";
  else clearTimeout(settleTimeout);

  settleTimeout = setTimeout(settle, SCROLL_SETTLE_MS);
};

export const usePauseSparksWhileScrolling = () => {
  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- holds one shared capturing document scroll listener while any ember is mounted
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
