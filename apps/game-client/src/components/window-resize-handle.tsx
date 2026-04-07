import { type FC, useCallback, useRef } from "react";

const getScale = () => {
  if (typeof window.getZoomFactor === "function") {
    return window.getZoomFactor();
  }
  return window.visualViewport?.scale ?? 1;
};

let resizeSessionCounter = 0;
let activeResizeSessionId: number | null = null;
let cancelActiveResizeSession: (() => void) | null = null;

export const cancelWindowResizeSession = () => {
  if (!cancelActiveResizeSession) return;
  const cancel = cancelActiveResizeSession;
  cancelActiveResizeSession = null;
  cancel();
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
  onResize: (size: { width: number; height: number }) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
}

export const WindowResizeHandle: FC<WindowResizeHandleProps> = ({
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  onResize,
  onResizeStart,
  onResizeEnd,
}) => {
  const activeTouchIdRef = useRef<number | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      cancelWindowResizeSession();

      onResizeStart();
      const sessionId = ++resizeSessionCounter;
      activeResizeSessionId = sessionId;

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth =
        (e.currentTarget.parentElement?.parentElement as HTMLElement)
          ?.offsetWidth ?? minWidth;
      const startHeight =
        (e.currentTarget.parentElement?.parentElement as HTMLElement)
          ?.offsetHeight ?? minHeight;

      const handleMouseMove = (e: MouseEvent) => {
        if (activeResizeSessionId !== sessionId) return;
        const scale = getScale();
        const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
        const viewportHeight =
          window.visualViewport?.height ?? window.innerHeight;
        const scaledViewportWidth = viewportWidth * scale;
        const scaledViewportHeight = viewportHeight * scale;

        const deltaX = (e.clientX - startX) / scale;
        const deltaY = (e.clientY - startY) / scale;

        const newWidth = Math.max(
          minWidth,
          Math.min(maxWidth ?? scaledViewportWidth, startWidth + deltaX),
        );
        const newHeight = Math.max(
          minHeight,
          Math.min(maxHeight ?? scaledViewportHeight, startHeight + deltaY),
        );
        onResize({ width: newWidth, height: newHeight });
      };

      const cleanupMouseListeners = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      const finishMouseResize = () => {
        if (activeResizeSessionId === sessionId) {
          activeResizeSessionId = null;
        }
        if (cancelActiveResizeSession === finishMouseResize) {
          cancelActiveResizeSession = null;
        }
        onResizeEnd();
        cleanupMouseListeners();
      };

      const handleMouseUp = () => {
        finishMouseResize();
      };

      cancelActiveResizeSession = finishMouseResize;
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [
      minWidth,
      minHeight,
      maxWidth,
      maxHeight,
      onResize,
      onResizeStart,
      onResizeEnd,
    ],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.touches.length > 1) return;
      cancelWindowResizeSession();

      onResizeStart();
      const sessionId = ++resizeSessionCounter;
      activeResizeSessionId = sessionId;

      const touch = e.touches[0];
      activeTouchIdRef.current = touch.identifier;
      const startX = touch.pageX - window.scrollX;
      const startY = touch.pageY - window.scrollY;
      const startWidth =
        (e.currentTarget.parentElement?.parentElement as HTMLElement)
          ?.offsetWidth ?? minWidth;
      const startHeight =
        (e.currentTarget.parentElement?.parentElement as HTMLElement)
          ?.offsetHeight ?? minHeight;

      const handleTouchMove = (e: TouchEvent) => {
        if (activeResizeSessionId !== sessionId) return;
        const activeTouchId = activeTouchIdRef.current;
        const touch =
          activeTouchId === null
            ? e.touches[0]
            : getTouchByIdentifier(e.touches, activeTouchId);
        if (!touch) return;
        e.preventDefault();
        const scale = getScale();
        const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
        const viewportHeight =
          window.visualViewport?.height ?? window.innerHeight;
        const scaledViewportWidth = viewportWidth * scale;
        const scaledViewportHeight = viewportHeight * scale;

        const clientX = touch.pageX - window.scrollX;
        const clientY = touch.pageY - window.scrollY;
        const deltaX = (clientX - startX) * scale;
        const deltaY = (clientY - startY) * scale;

        const newWidth = Math.max(
          minWidth,
          Math.min(maxWidth ?? scaledViewportWidth, startWidth + deltaX),
        );
        const newHeight = Math.max(
          minHeight,
          Math.min(maxHeight ?? scaledViewportHeight, startHeight + deltaY),
        );
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
        activeResizeSessionId = null;
        if (cancelActiveResizeSession === finishTouchResize) {
          cancelActiveResizeSession = null;
        }
        onResizeEnd();
        cleanupTouchListeners();
      };

      const handleTouchEnd = (e: TouchEvent) => {
        if (activeResizeSessionId !== sessionId) return;
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

      cancelActiveResizeSession = finishTouchResize;
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);
      document.addEventListener("touchcancel", handleTouchEnd);
      window.addEventListener("touchend", handleTouchEnd);
      window.addEventListener("touchcancel", handleTouchEnd);
    },
    [
      minWidth,
      minHeight,
      maxWidth,
      maxHeight,
      onResize,
      onResizeStart,
      onResizeEnd,
    ],
  );

  return (
    <div
      className="ll:absolute ll:bottom-0 ll:right-0 ll:w-4 ll:h-4 ll:cursor-se-resize ll:bg-transparent touch-none"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        background:
          "linear-gradient(-45deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)",
        touchAction: "none",
      }}
    >
      <div className="ll:absolute ll:-bottom-2 ll:-right-2 ll:w-8 ll:h-8 ll:pointer-events-auto" />
    </div>
  );
};
