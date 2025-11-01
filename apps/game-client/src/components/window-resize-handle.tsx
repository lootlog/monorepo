import { type FC, useCallback } from "react";

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

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth =
        (e.currentTarget.parentElement?.parentElement as HTMLElement)
          ?.offsetWidth || minWidth;
      const startHeight =
        (e.currentTarget.parentElement?.parentElement as HTMLElement)
          ?.offsetHeight || minHeight;

      const handleMouseMove = (e: MouseEvent) => {
        const newWidth = Math.max(
          minWidth,
          Math.min(
            maxWidth || window.innerWidth,
            startWidth + (e.clientX - startX),
          ),
        );
        const newHeight = Math.max(
          minHeight,
          Math.min(
            maxHeight || window.innerHeight,
            startHeight + (e.clientY - startY),
          ),
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

  return (
    <div
      className="ll:absolute ll:bottom-0 ll:right-0 ll:w-4 ll:h-4 ll:cursor-se-resize ll:bg-transparent"
      onMouseDown={handleMouseDown}
      style={{
        background:
          "linear-gradient(-45deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)",
      }}
    />
  );
};
