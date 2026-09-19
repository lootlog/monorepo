import { useEffect, useRef } from "react";

type UseInfiniteScrollSentinelOptions = {
  enabled?: boolean;
  fetchNextPage: (() => void) | undefined;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  scrollElement: Element | null;
};

/**
 * Requests the next page when the returned sentinel approaches the visible
 * part of a DOM-scrolled list. Observation restarts after each page, so a
 * sentinel that is still in view once a page loads requests the following one. Virtualized lists use `useVirtualInfiniteScroll` instead.
 */
export const useInfiniteScrollSentinel = <TSentinel extends Element>({
  enabled = true,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  scrollElement,
}: UseInfiniteScrollSentinelOptions) => {
  const sentinelRef = useRef<TSentinel>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (
      !sentinel ||
      !enabled ||
      !hasNextPage ||
      isFetchingNextPage ||
      !scrollElement ||
      !fetchNextPage ||
      typeof IntersectionObserver === "undefined"
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          fetchNextPage();
        }
      },
      {
        root: scrollElement,
        rootMargin: "240px 0px",
      },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [enabled, fetchNextPage, hasNextPage, isFetchingNextPage, scrollElement]);

  return sentinelRef;
};
