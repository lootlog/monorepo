import { useEffect } from "react";

export function useScrollToTop(pathname: string) {
  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- moves the document scroll position to the top when the rendered page changes
  useEffect(() => {
    if (window.location.hash) return;

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
}
