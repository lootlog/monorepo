import {
  placeTooltipAtCursor,
  type BoxSize,
  type CursorPoint,
  type CursorTooltipOffsets,
} from "./cursor-tooltip-placement";

/*
 * Cursor following bypasses React and Base UI on purpose: Base UI's own
 * `trackCursorAxis` re-renders the tooltip and re-runs async positioning on
 * every mousemove, which visibly lags behind the pointer. Instead one passive
 * listener records the pointer and every open tooltip is placed straight on
 * its positioner element, at most once per animation frame.
 *
 * A frame only writes styles. Reading `offsetWidth` or `innerWidth` would
 * force the game document to lay out on every pointer move, so the tooltip
 * size is measured once on registration and refreshed by ResizeObserver, and
 * the viewport size is cached until the window resizes.
 */
type CursorFollower = {
  element: HTMLElement;
  offsets: CursorTooltipOffsets;
  size: BoxSize;
};

const cursorFollowers = new Set<CursorFollower>();

let cursor: CursorPoint | null = null;

let cursorFrame: number | null = null;

let cursorTracked = false;

let viewportSize: BoxSize | null = null;

const getViewportSize = () => {
  viewportSize ??= { width: window.innerWidth, height: window.innerHeight };

  return viewportSize;
};

const placeFollower = ({ element, offsets, size }: CursorFollower) => {
  if (!cursor) return;

  const placement = placeTooltipAtCursor(
    cursor,
    size,
    getViewportSize(),
    offsets,
  );

  element.style.position = "fixed";
  element.style.left = `${placement.left}px`;
  element.style.top = `${placement.top}px`;
  element.style.transform = "none";
};

const scheduleFollowerPlacement = () => {
  if (cursorFrame !== null || cursorFollowers.size === 0) return;

  cursorFrame = window.requestAnimationFrame(() => {
    cursorFrame = null;
    cursorFollowers.forEach(placeFollower);
  });
};

const trackCursor = (event: PointerEvent) => {
  cursor = { x: event.clientX, y: event.clientY };
  scheduleFollowerPlacement();
};

const invalidateViewportSize = () => {
  viewportSize = null;
  scheduleFollowerPlacement();
};

export const ensureCursorTracking = () => {
  if (cursorTracked) return;

  cursorTracked = true;
  window.addEventListener("pointermove", trackCursor, { passive: true });
  window.addEventListener("resize", invalidateViewportSize);
};

export const getCursorPoint = (): CursorPoint | null => cursor;

export const registerCursorFollower = (
  element: HTMLElement,
  offsets: CursorTooltipOffsets,
): (() => void) => {
  const follower: CursorFollower = {
    element,
    offsets,
    size: { width: element.offsetWidth, height: element.offsetHeight },
  };

  cursorFollowers.add(follower);
  placeFollower(follower);

  // ResizeObserver delivers after layout, so reading offset sizes here does
  // not force one; it keeps the cached size right when the content changes.
  const resizeObserver = new ResizeObserver(() => {
    follower.size = {
      width: element.offsetWidth,
      height: element.offsetHeight,
    };
    scheduleFollowerPlacement();
  });

  resizeObserver.observe(element);

  return () => {
    cursorFollowers.delete(follower);
    resizeObserver.disconnect();
  };
};
