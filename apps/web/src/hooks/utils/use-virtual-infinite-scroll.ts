import { useEffect, useRef } from "react";
import {
  getPageScroller,
  usePageScrollsDocument,
} from "@/hooks/utils/use-page-scroll";

type VirtualItemLike = {
  index: number;
};

type UseVirtualInfiniteScrollOptions = {
  enabled?: boolean;
  fetchNextPage: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  itemCount: number;
  virtualItems: VirtualItemLike[];
};

type UseResetScrollTopOptions = {
  behavior?: ScrollBehavior;
  enabled?: boolean;
  /** The page's scroll viewport. */
  getScrollElement: () => HTMLElement | null;
  resetKey: string | undefined;
};

export const useVirtualInfiniteScroll = ({
  enabled = true,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  itemCount,
  virtualItems,
}: UseVirtualInfiniteScrollOptions) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const lastVirtualItem = virtualItems[virtualItems.length - 1];

    if (!lastVirtualItem) {
      return;
    }

    if (
      lastVirtualItem.index >= itemCount - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      void fetchNextPage();
    }
  }, [
    enabled,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    itemCount,
    virtualItems,
  ]);
};

/**
 * Returns the page to its top when `resetKey` changes, such as when filters
 * replace the list. Mounting leaves the position to scroll restoration.
 */
export const useResetScrollTop = ({
  behavior,
  enabled = true,
  getScrollElement,
  resetKey,
}: UseResetScrollTopOptions) => {
  const scrollsDocument = usePageScrollsDocument();
  const appliedResetKey = useRef(resetKey);

  useEffect(() => {
    if (appliedResetKey.current === resetKey) return;
    appliedResetKey.current = resetKey;

    if (!enabled) return;
    getPageScroller(getScrollElement(), scrollsDocument)?.scrollTo({
      top: 0,
      left: 0,
      behavior,
    });
  }, [behavior, enabled, getScrollElement, resetKey, scrollsDocument]);
};
