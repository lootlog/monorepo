export const scrollViewportToNowIndicator = (nowIndicator: HTMLElement) => {
  const scrollViewport = nowIndicator.closest(
    '[data-slot="scroll-area-viewport"]',
  );
  if (!(scrollViewport instanceof HTMLElement)) return;

  scrollViewport.scrollTop = Math.max(
    0,
    nowIndicator.offsetTop - scrollViewport.clientHeight / 2,
  );
  scrollViewport.scrollLeft = 0;
};
