import { useTranslation } from "react-i18next";
import { type FC, useRef } from "react";
import { getRuntimeUiScale } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
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

const getScaledViewportSize = (scale: number) => ({
  width: (window.visualViewport?.width ?? window.innerWidth) * scale,
  height: (window.visualViewport?.height ?? window.innerHeight) * scale,
});

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
    const startWidth =
      e.currentTarget.parentElement?.parentElement?.offsetWidth ?? minWidth;
    const startHeight =
      e.currentTarget.parentElement?.parentElement?.offsetHeight ?? minHeight;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isWindowResizeSessionActive(sessionId)) return;
      const scale = getRuntimeUiScale();
      const { width: scaledViewportWidth, height: scaledViewportHeight } =
        getScaledViewportSize(scale);

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
      onResize({ width: newWidth, height: newHeight });
    };

    const cleanupMouseListeners = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    const finishMouseResize = () => {
      finishWindowResizeSession(sessionId, finishMouseResize);
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
    const startWidth =
      e.currentTarget.parentElement?.parentElement?.offsetWidth ?? minWidth;
    const startHeight =
      e.currentTarget.parentElement?.parentElement?.offsetHeight ?? minHeight;

    const handleTouchMove = (e: TouchEvent) => {
      if (!isWindowResizeSessionActive(sessionId)) return;
      const activeTouchId = activeTouchIdRef.current;
      const touch =
        activeTouchId === null
          ? e.touches[0]
          : getTouchByIdentifier(e.touches, activeTouchId);
      if (!touch) return;
      e.preventDefault();
      const scale = getRuntimeUiScale();
      const { width: scaledViewportWidth, height: scaledViewportHeight } =
        getScaledViewportSize(scale);

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
      onResize({ width: newWidth, height: newHeight });
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
    const root = event.currentTarget.parentElement?.parentElement;
    const width = root?.offsetWidth ?? minWidth;
    const height = root?.offsetHeight ?? minHeight;
    const step = event.shiftKey ? 10 : 1;
    const scale = getRuntimeUiScale();
    const viewport = getScaledViewportSize(scale);
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

  return (
    <button
      type="button"
      aria-label={t("actions.resizeWindow")}
      onKeyDown={handleKeyboardResize}
      onKeyUp={finishKeyboardResize}
      onBlur={finishKeyboardResize}
      data-ll-window-resize-handle=""
      className="ll:absolute ll:bottom-0 ll:right-0 ll:w-3 ll:h-3 ll:bg-transparent ll:border-0 ll:p-0 ll:focus-visible:outline-2 ll:focus-visible:outline-ring touch-none"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        background:
          "linear-gradient(-45deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)",
        clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
        cursor,
        touchAction: "none",
      }}
    />
  );
};
