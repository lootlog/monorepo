import { useLayoutEffect, useState } from "react";

const bottomInset = (element: Element) => {
  const style = getComputedStyle(element);

  return (
    Number.parseFloat(style.paddingBottom) +
    Number.parseFloat(style.borderBottomWidth)
  );
};

export const useFillRemainingHeight = (
  element: HTMLElement | null,
  minHeight: number,
) => {
  const [height, setHeight] = useState<number>();

  useLayoutEffect(() => {
    if (!element || element.parentElement?.closest("[data-page-fill]")) return;

    const viewport = element.closest<HTMLElement>(
      "[data-slot=scroll-area-viewport]",
    );

    const scroller =
      viewport && getComputedStyle(viewport).overflowY !== "visible"
        ? viewport
        : document.documentElement;

    const update = () => {
      const top =
        element.getBoundingClientRect().top -
        (scroller === document.documentElement
          ? 0
          : scroller.getBoundingClientRect().top) +
        scroller.scrollTop;

      let below = 0;

      for (
        let parent = element.parentElement;
        parent && parent !== scroller && parent !== document.body;
        parent = parent.parentElement
      )
        below += bottomInset(parent);

      setHeight(Math.max(scroller.clientHeight - top - below, minHeight));
    };

    update();

    const observer = new ResizeObserver(update);

    observer.observe(scroller);

    for (const content of scroller === document.documentElement
      ? [document.body]
      : scroller.children)
      observer.observe(content);

    return () => observer.disconnect();
  }, [element, minHeight]);

  return element ? height : undefined;
};
