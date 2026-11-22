import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import {
  useVirtualizer,
  useWindowVirtualizer,
  type ReactVirtualizerOptions,
  type VirtualItem,
} from "@tanstack/react-virtual";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";

export const usePageScrollsDocument = () => useIsMobile();

export type PageScroller = {
  eventTarget: HTMLElement | Window;
  getScrollTop: () => number;
  getMaxScrollTop: () => number;
  scrollTo: (options: ScrollToOptions) => void;
  getVisibleBand: () => { top: number; bottom: number };
};

export const getPageScroller = (
  viewport: HTMLElement | null,
  scrollsDocument: boolean,
): PageScroller | null => {
  if (scrollsDocument) {
    const root = document.scrollingElement ?? document.documentElement;

    return {
      eventTarget: window,
      getScrollTop: () => root.scrollTop,
      getMaxScrollTop: () => root.scrollHeight - root.clientHeight,
      scrollTo: (options) => window.scrollTo(options),
      getVisibleBand: () => ({
        top: Number.parseFloat(getComputedStyle(root).scrollPaddingTop) || 0,
        bottom: root.clientHeight,
      }),
    };
  }

  if (!viewport) return null;

  return {
    eventTarget: viewport,
    getScrollTop: () => viewport.scrollTop,
    getMaxScrollTop: () => viewport.scrollHeight - viewport.clientHeight,
    scrollTo: (options) => viewport.scrollTo(options),
    getVisibleBand: () => {
      const { top, bottom } = viewport.getBoundingClientRect();

      return { top, bottom };
    },
  };
};

export const useDocumentScrollListener = (onScroll: () => void) => {
  const scrollsDocument = usePageScrollsDocument();
  const handleScroll = useEffectEvent(onScroll);

  useEffect(() => {
    if (!scrollsDocument) return;

    const listener = () => handleScroll();
    window.addEventListener("scroll", listener, { passive: true });

    return () => window.removeEventListener("scroll", listener);
  }, [scrollsDocument]);
};

type ScrollerBoundOption =
  | "getScrollElement"
  | "observeElementRect"
  | "observeElementOffset"
  | "scrollToFn"
  | "scrollMargin"
  | "onChange"
  | "measureElement";

type PageVirtualizerOptions<TItemElement extends Element> = Omit<
  ReactVirtualizerOptions<HTMLDivElement, TItemElement>,
  ScrollerBoundOption
> & {
  scrollElement: HTMLDivElement | null;
  listRef?: RefObject<Element | null>;
};

export const usePageVirtualizer = <TItemElement extends Element>({
  scrollElement: viewport,
  listRef,
  enabled = true,
  ...options
}: PageVirtualizerOptions<TItemElement>) => {
  const scrollsDocument = usePageScrollsDocument();
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const list = listRef?.current ?? viewport;

    if (!enabled || !list) return;

    const updateScrollMargin = () => {
      const listTop = list.getBoundingClientRect().top;

      if (scrollsDocument) {
        setScrollMargin(listTop + window.scrollY);

        return;
      }

      if (!viewport) return;

      setScrollMargin(
        list === viewport
          ? 0
          : listTop - viewport.getBoundingClientRect().top + viewport.scrollTop,
      );
    };

    updateScrollMargin();

    const observer = new ResizeObserver(updateScrollMargin);

    if (scrollsDocument) observer.observe(document.body);

    if (viewport) {
      observer.observe(viewport);

      if (viewport.firstElementChild)
        observer.observe(viewport.firstElementChild);
    }

    if (list.parentElement) observer.observe(list.parentElement);
    window.addEventListener("resize", updateScrollMargin);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScrollMargin);
    };
  }, [enabled, listRef, scrollsDocument, viewport]);

  const viewportVirtualizer = useVirtualizer<HTMLDivElement, TItemElement>({
    ...options,
    enabled: enabled && !scrollsDocument,
    getScrollElement: () => viewport,
    scrollMargin,
  });

  const documentVirtualizer = useWindowVirtualizer<TItemElement>({
    ...options,
    enabled: enabled && scrollsDocument,
    scrollMargin,
  });

  return scrollsDocument ? documentVirtualizer : viewportVirtualizer;
};

export const getVirtualListPadding = (
  virtualItems: VirtualItem[],
  totalSize: number,
  scrollMargin: number,
) => {
  const firstItem = virtualItems[0];
  const lastItem = virtualItems[virtualItems.length - 1];

  if (!firstItem || !lastItem) return { top: 0, bottom: 0 };

  return {
    top: firstItem.start - scrollMargin,
    bottom: totalSize - (lastItem.end - scrollMargin),
  };
};
