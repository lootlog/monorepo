export function preventIosFocusZoom() {
  const isIos =
    /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1);

  const viewport = document.querySelector('meta[name="viewport"]');
  const content = viewport?.getAttribute("content");

  if (!isIos || !viewport || !content || content.includes("maximum-scale")) {
    return;
  }

  viewport.setAttribute("content", `${content}, maximum-scale=1`);
}
