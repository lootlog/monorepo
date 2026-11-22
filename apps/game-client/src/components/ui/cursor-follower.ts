import {
  placeTooltipAtCursor,
  type BoxSize,
  type CursorPoint,
  type CursorTooltipOffsets,
} from "./cursor-tooltip-placement";

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
  element.style.left = "0px";
  element.style.top = "0px";
  element.style.transform = `translate(${Math.round(placement.left)}px, ${Math.round(placement.top)}px)`;
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
