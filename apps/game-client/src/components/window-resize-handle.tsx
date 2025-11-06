import { type FC, useCallback } from "react";

const getScale = () => {
  if (typeof window.getZoomFactor === "function") {
    return window.getZoomFactor();
  }
  return window.visualViewport?.scale ?? 1;
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
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      onResizeStart();

      const scale = getScale();
      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth =
        (e.currentTarget.parentElement?.parentElement as HTMLElement)
          ?.offsetWidth || minWidth;
      const startHeight =
        (e.currentTarget.parentElement?.parentElement as HTMLElement)
          ?.offsetHeight || minHeight;

      const handleMouseMove = (e: MouseEvent) => {
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
          Math.min(maxWidth || scaledViewportWidth, startWidth + deltaX),
        );
        const newHeight = Math.max(
          minHeight,
          Math.min(maxHeight || scaledViewportHeight, startHeight + deltaY),
        );
        onResize({ width: newWidth, height: newHeight });
      };

      const handleMouseUp = () => {
        onResizeEnd();
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

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

      onResizeStart();

      const touch = e.touches[0];
      const startX = touch.pageX - window.scrollX;
      const startY = touch.pageY - window.scrollY;
      const startWidth =
        (e.currentTarget.parentElement?.parentElement as HTMLElement)
          ?.offsetWidth || minWidth;
      const startHeight =
        (e.currentTarget.parentElement?.parentElement as HTMLElement)
          ?.offsetHeight || minHeight;

      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
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
          Math.min(maxWidth || scaledViewportWidth, startWidth + deltaX),
        );
        const newHeight = Math.max(
          minHeight,
          Math.min(maxHeight || scaledViewportHeight, startHeight + deltaY),
        );
        onResize({ width: newWidth, height: newHeight });
      };

      const handleTouchEnd = () => {
        onResizeEnd();
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };

      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);
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
