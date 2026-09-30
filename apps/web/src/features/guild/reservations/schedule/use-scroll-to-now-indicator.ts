import { useEffect, useEffectEvent, type RefObject } from "react";
import {
  getPageScroller,
  usePageScrollsDocument,
} from "@/hooks/utils/use-page-scroll";

/** Centres the current time in the schedule's scroller when it comes into view. */
export const useScrollToNowIndicator = (
  nowRef: RefObject<HTMLElement | null>,
  isNowShown: boolean,
) => {
  const scrollsDocument = usePageScrollsDocument();

  const scrollToNow = useEffectEvent((nowIndicator: HTMLElement) => {
    const scrollViewport = nowIndicator.closest<HTMLElement>(
      '[data-slot="scroll-area-viewport"]',
    );

    if (scrollViewport) scrollViewport.scrollLeft = 0;

    const scroller = getPageScroller(scrollViewport, scrollsDocument);

    if (!scroller) return;

    const { top, bottom } = scroller.getVisibleBand();

    scroller.scrollTo({
      top: Math.max(
        0,
        scroller.getScrollTop() +
          nowIndicator.getBoundingClientRect().top -
          (top + bottom) / 2,
      ),
    });
  });

  useEffect(() => {
    const nowIndicator = nowRef.current;

    if (!isNowShown || !nowIndicator) return;
    scrollToNow(nowIndicator);
  }, [isNowShown, nowRef]);
};
