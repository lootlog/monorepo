// iOS zooms the page into a focused field set below 16px. A maximum scale of 1
// stops that zoom while iOS still lets people pinch-zoom; other browsers would
// block pinch zoom with it, so only iOS gets it.
export function preventIosFocusZoom() {
  const isIos =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    // iPadOS reports a Mac.
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

  const viewport = document.querySelector('meta[name="viewport"]');
  const content = viewport?.getAttribute("content");

  if (!isIos || !viewport || !content || content.includes("maximum-scale")) {
    return;
  }

  viewport.setAttribute("content", `${content}, maximum-scale=1`);
}
