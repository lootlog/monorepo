import { useEffect, useRef } from "react";
import { usePageScrollsDocument } from "@/hooks/utils/use-page-scroll";

type UseInfiniteScrollSentinelOptions = {
  enabled?: boolean;
  fetchNextPage: (() => void) | undefined;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  /** The page's scroll viewport; the document stands in for it below `md`. */
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
  const scrollsDocument = usePageScrollsDocument();
  // A viewport that only grows with its content would always contain the sentinel.
  const root = scrollsDocument ? null : scrollElement;

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (
      !sentinel ||
      !enabled ||
      !hasNextPage ||
      isFetchingNextPage ||
      (!scrollsDocument && !scrollElement) ||
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
        root,
        rootMargin: "240px 0px",
      },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [
    enabled,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    root,
    scrollElement,
    scrollsDocument,
  ]);

  return sentinelRef;
};
