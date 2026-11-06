/**
 * A ref for a bar pinned under the app bar. On phones the bar pinned flush
 * under the top bar draws the top bar's glass too (`page-scroll.css`), so it
 * reaches above its own box. It does so only while it sits there,
 * `data-top-bar-glass="pinned"`: lower on the page, that glass would blur
 * the content above the bar and leave the top bar without any.
 */
export const observeTopBarGlass = (bar: HTMLElement | null) => {
  if (!bar || typeof IntersectionObserver === "undefined") return;

  const pinnedTop = Number.parseFloat(getComputedStyle(bar).top) || 0;

  // The root starts a pixel under the pinned position, so a pinned bar is
  // cut at its top and a bar lower on the page is not.
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry) return;

      const pinned =
        entry.isIntersecting && entry.boundingClientRect.top <= pinnedTop + 1;

      bar.dataset.topBarGlass = pinned ? "pinned" : "";
    },
    { rootMargin: `-${pinnedTop + 1}px 0px 0px 0px`, threshold: [0, 1] },
  );

  observer.observe(bar);

  return () => observer.disconnect();
};
