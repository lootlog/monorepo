import { useEffect, useRef } from "react";
import { usePageScrollsDocument } from "@lootlog/ui/hooks/use-page-scroll";

type UseInfiniteScrollSentinelOptions = {
  enabled?: boolean;
  fetchNextPage: (() => void) | undefined;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  scrollElement: Element | null;
};

export const useInfiniteScrollSentinel = <TSentinel extends Element>({
  enabled = true,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  scrollElement,
}: UseInfiniteScrollSentinelOptions) => {
  const sentinelRef = useRef<TSentinel>(null);
  const scrollsDocument = usePageScrollsDocument();
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
