import { cn } from "cn";
import { useTranslation } from "react-i18next";
import { type FC, useRef } from "react";
import { measureWindowViewport } from "@/hooks/ui/window-viewport";
import {
  cancelWindowResizeSession,
  createWindowResizeSession,
  finishWindowResizeSession,
  isWindowResizeSessionActive,
  registerWindowResizeSessionCancellation,
} from "./window-resize-session";

const KEYBOARD_RESIZE_DELTAS = new Map([
  ["ArrowLeft", { x: -1, y: 0 }],
  ["ArrowRight", { x: 1, y: 0 }],
  ["ArrowUp", { x: 0, y: -1 }],
  ["ArrowDown", { x: 0, y: 1 }],
]);

type WindowSize = { width: number; height: number };

/** Resize previews re-render the window, so pointer moves apply at most once per frame. */
const createFrameCoalescer = (apply: (size: WindowSize) => void) => {
  let pendingSize: WindowSize | null = null;
  let frameId: number | null = null;

  const flush = () => {
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }

    const size = pendingSize;
    pendingSize = null;

    if (size) apply(size);
  };

  const queue = (size: WindowSize) => {
    pendingSize = size;

    if (frameId !== null) return;

    frameId = window.requestAnimationFrame(() => {
      frameId = null;
      flush();
    });
  };

  return { flush, queue };
};

const getWindowElement = (handle: Element) =>
  handle.closest<HTMLElement>("[data-ll-draggable-window]");

const getResizeCursor = ({
  allowHorizontalResize,
  allowVerticalResize,
}: {
  allowHorizontalResize: boolean;
  allowVerticalResize: boolean;
}) => {
  if (allowHorizontalResize && allowVerticalResize) {
    return "se-resize";
  }

  if (allowHorizontalResize) {
    return "ew-resize";
  }

  return "ns-resize";
};

const getTouchByIdentifier = (touchList: TouchList, identifier: number) => {
  for (let i = 0; i < touchList.length; i += 1) {
    const touch = touchList.item(i);

    if (touch && touch.identifier === identifier) {
      return touch;
    }
  }

  return null;
};

const hasTouchIdentifier = (touchList: TouchList, identifier: number) => {
  return getTouchByIdentifier(touchList, identifier) !== null;
};

interface WindowResizeHandleProps {
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  allowHorizontalResize?: boolean;
  allowVerticalResize?: boolean;
  onResize: (size: { width: number; height: number }) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
  /** Hides the handle while the window body is not yet or no longer shown. */
  hidden?: boolean;
}

export const WindowResizeHandle: FC<WindowResizeHandleProps> = ({
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  allowHorizontalResize = true,
  allowVerticalResize = true,
  onResize,
  onResizeStart,
  onResizeEnd,
  hidden = false,
}) => {
  const { t } = useTranslation("common");
  const keyboardResizing = useRef(false);
  const activeTouchIdRef = useRef<number | null>(null);

  const cursor = getResizeCursor({
    allowHorizontalResize,
    allowVerticalResize,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    cancelWindowResizeSession();

    onResizeStart();
    const sessionId = createWindowResizeSession();

    const startX = e.clientX;
    const startY = e.clientY;
    const windowElement = getWindowElement(e.currentTarget);
    const startWidth = windowElement?.offsetWidth ?? minWidth;
    const startHeight = windowElement?.offsetHeight ?? minHeight;

    // Measured once per session: viewport reads force the game document to
    // lay out, which is too expensive to repeat on every mouse move.
    const {
      scale,
      width: scaledViewportWidth,
      height: scaledViewportHeight,
    } = measureWindowViewport();

    const resizeFrame = createFrameCoalescer(onResize);

    const handleMouseMove = (e: MouseEvent) => {
      if (!isWindowResizeSessionActive(sessionId)) return;
      const deltaX = (e.clientX - startX) / scale;
      const deltaY = (e.clientY - startY) / scale;

      const newWidth = allowHorizontalResize
        ? Math.max(
            minWidth,
            Math.min(maxWidth ?? scaledViewportWidth, startWidth + deltaX),
          )
        : startWidth;

      const newHeight = allowVerticalResize
        ? Math.max(
            minHeight,
            Math.min(maxHeight ?? scaledViewportHeight, startHeight + deltaY),
          )
        : startHeight;

      resizeFrame.queue({ width: newWidth, height: newHeight });
    };

    const cleanupMouseListeners = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    const finishMouseResize = () => {
      finishWindowResizeSession(sessionId, finishMouseResize);
      resizeFrame.flush();
      onResizeEnd();
      cleanupMouseListeners();
    };

    const handleMouseUp = () => {
      finishMouseResize();
    };

    registerWindowResizeSessionCancellation(finishMouseResize);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.touches.length > 1) return;
    cancelWindowResizeSession();

    onResizeStart();
    const sessionId = createWindowResizeSession();

    const touch = e.touches[0];
    activeTouchIdRef.current = touch.identifier;
    const startX = touch.pageX - window.scrollX;
    const startY = touch.pageY - window.scrollY;
    const windowElement = getWindowElement(e.currentTarget);
    const startWidth = windowElement?.offsetWidth ?? minWidth;
    const startHeight = windowElement?.offsetHeight ?? minHeight;

    const {
      scale,
      width: scaledViewportWidth,
      height: scaledViewportHeight,
    } = measureWindowViewport();

    const resizeFrame = createFrameCoalescer(onResize);

    const handleTouchMove = (e: TouchEvent) => {
      if (!isWindowResizeSessionActive(sessionId)) return;
      const activeTouchId = activeTouchIdRef.current;

      const touch =
        activeTouchId === null
          ? e.touches[0]
          : getTouchByIdentifier(e.touches, activeTouchId);

      if (!touch) return;
      e.preventDefault();
      const clientX = touch.pageX - window.scrollX;
      const clientY = touch.pageY - window.scrollY;
      const deltaX = (clientX - startX) * scale;
      const deltaY = (clientY - startY) * scale;

      const newWidth = allowHorizontalResize
        ? Math.max(
            minWidth,
            Math.min(maxWidth ?? scaledViewportWidth, startWidth + deltaX),
          )
        : startWidth;

      const newHeight = allowVerticalResize
        ? Math.max(
            minHeight,
            Math.min(maxHeight ?? scaledViewportHeight, startHeight + deltaY),
          )
        : startHeight;

      resizeFrame.queue({ width: newWidth, height: newHeight });
    };

    const cleanupTouchListeners = () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchEnd);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };

    const finishTouchResize = () => {
      activeTouchIdRef.current = null;
      finishWindowResizeSession(sessionId, finishTouchResize);
      resizeFrame.flush();
      onResizeEnd();
      cleanupTouchListeners();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isWindowResizeSessionActive(sessionId)) return;
      const activeTouchId = activeTouchIdRef.current;

      if (activeTouchId !== null) {
        const activeTouchStillPresent = hasTouchIdentifier(
          e.touches,
          activeTouchId,
        );

        if (activeTouchStillPresent) return;
      }

      finishTouchResize();
    };

    registerWindowResizeSessionCancellation(finishTouchResize);
    document.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    document.addEventListener("touchend", handleTouchEnd);
    document.addEventListener("touchcancel", handleTouchEnd);
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
  };

  const handleKeyboardResize = (
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) => {
    const delta = KEYBOARD_RESIZE_DELTAS.get(event.key);

    if (!delta) return;
    const horizontal = allowHorizontalResize && delta.x !== 0;
    const vertical = allowVerticalResize && delta.y !== 0;

    if (!horizontal && !vertical) return;
    event.preventDefault();
    event.stopPropagation();

    if (!keyboardResizing.current) {
      cancelWindowResizeSession();
      keyboardResizing.current = true;
      onResizeStart();
    }

    const root = getWindowElement(event.currentTarget);
    const width = root?.offsetWidth ?? minWidth;
    const height = root?.offsetHeight ?? minHeight;
    const step = event.shiftKey ? 10 : 1;
    const viewport = measureWindowViewport();
    onResize({
      width: horizontal
        ? Math.max(
            minWidth,
            Math.min(maxWidth ?? viewport.width, width + delta.x * step),
          )
        : width,
      height: vertical
        ? Math.max(
            minHeight,
            Math.min(maxHeight ?? viewport.height, height + delta.y * step),
          )
        : height,
    });
  };

  const finishKeyboardResize = () => {
    if (!keyboardResizing.current) return;
    keyboardResizing.current = false;
    onResizeEnd();
  };

  // A 16px target centered 2px inside the window corner, so it covers the
  // border and padding rather than content. The grip shows faintly at rest
  // and brightens on hover and keyboard focus.
  return (
    <button
      type="button"
      aria-label={t("actions.resizeWindow")}
      onKeyDown={handleKeyboardResize}
      onKeyUp={finishKeyboardResize}
      onBlur={finishKeyboardResize}
      data-ll-window-resize-handle=""
      data-ll-draggable="false"
      className={cn(
        "ll:absolute ll:-right-1.5 ll:-bottom-1.5 ll:size-4 ll:rounded-sm ll:border-0 ll:p-0 ll:text-white ll:opacity-40 ll:transition-opacity ll:motion-reduce:transition-none ll:hover:opacity-90 ll:focus-visible:opacity-90 ll:focus-visible:outline-2 ll:focus-visible:outline-ring ll:touch-none",
        hidden && "ll:invisible",
      )}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        background:
          "linear-gradient(-45deg, transparent 0 34%, currentColor 34% 42%, transparent 42% 56%, currentColor 56% 64%, transparent 64%) no-repeat right 7px bottom 7px / 8px 8px",
        cursor,
      }}
    />
  );
};
