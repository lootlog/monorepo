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

/**
 * Below the `md` breakpoint the document scrolls every page, so mobile
 * browsers can collapse their toolbars and offer pull-to-refresh. From `md`
 * up the app shell has a fixed height and each page scrolls its own viewport,
 * which then only grows with its content below `md`.
 */
export const usePageScrollsDocument = () => useIsMobile();

/** The scroller that moves a page: its own viewport, or the document. */
export type PageScroller = {
  /** Receives the scroll, wheel and touch events of the scroller. */
  eventTarget: HTMLElement | Window;
  getScrollTop: () => number;
  getMaxScrollTop: () => number;
  scrollTo: (options: ScrollToOptions) => void;
  /**
   * The band of the viewport the reader sees, in client coordinates. The
   * document's `scroll-padding-top` excludes the app bar pinned over it.
   */
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

/**
 * Calls `onScroll` while the document scrolls the page. A page viewport
 * reports its own scrolling through the scroll area's `onScroll`.
 */
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

// Options that depend on the scroller are chosen here, not by the caller.
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
  /** The page's scroll viewport. */
  scrollElement: HTMLDivElement | null;
  /** Where the first item starts; defaults to the top of the viewport. */
  listRef?: RefObject<Element | null>;
};

/**
 * Virtualizes a list in the page scroller. Items start at
 * `virtualizer.options.scrollMargin`, so position them relative to the list
 * with `item.start - scrollMargin`.
 *
 * The virtualizer mutates in place, so React Compiler must not memoize reads
 * from it. The compiler skips direct `useVirtualizer` callers on its own, but
 * not callers of this hook: mark them with `"use no memo"`.
 */
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
        listTop - viewport.getBoundingClientRect().top + viewport.scrollTop,
      );
    };

    updateScrollMargin();

    // Content above the list, such as filters or a loaded overview, moves it.
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

/**
 * Spacer heights around the rendered rows of a virtualized list that keeps
 * its rows in normal flow, such as table rows.
 */
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
