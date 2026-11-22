export const observeTopBarGlass = (bar: HTMLElement | null) => {
  if (!bar || typeof IntersectionObserver === "undefined") return;

  const pinnedTop = Number.parseFloat(getComputedStyle(bar).top) || 0;

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
