import { useEffect, type RefObject } from "react";

type VirtualItemLike = {
  index: number;
};

type UseVirtualInfiniteScrollOptions = {
  enabled?: boolean;
  fetchNextPage: () => Promise<unknown> | unknown;
  hasNextPage?: boolean;
  isFetchingNextPage: boolean;
  itemCount: number;
  virtualItems: VirtualItemLike[];
};

type UseResetScrollTopOptions = {
  resetKey: string;
  scrollElementRef: RefObject<HTMLElement | null>;
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

export const useResetScrollTop = ({
  resetKey,
  scrollElementRef,
}: UseResetScrollTopOptions) => {
  useEffect(() => {
    scrollElementRef.current?.scrollTo(0, 0);
  }, [resetKey, scrollElementRef]);
};
