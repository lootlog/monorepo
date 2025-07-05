import { useDrag } from "@/hooks/ui/use-drag";
import { cn } from "@/lib/utils";
import {
  useWindowsStore,
  WindowId,
  WindowOpacity,
} from "@/store/windows.store";
import { Pin, PinOff } from "lucide-react";
import { FC, useCallback, useEffect, useRef, useState } from "react";

export type DraggableWindowProps = {
  children: React.ReactNode;
  id: WindowId;
  actions?: React.ReactNode;
  title: string;
  onClose?: () => void;
  variant?: "default" | "small";
  resizable?: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  dynamicHeight?: boolean;
  closable?: boolean;
  disableTitle?: boolean;
};

const OPACITY_LEVELS: WindowOpacity[] = [1, 2, 3, 4, 5];

export const DraggableWindow: FC<DraggableWindowProps> = ({
  children,
  id,
  actions,
  title,
  onClose,
  variant = "small",
  resizable = true,
  minWidth = 242,
  minHeight = 240,
  maxWidth,
  maxHeight,
  dynamicHeight = false,
  closable = true,
  disableTitle = false,
}) => {
  const state = useWindowsStore();
  const opacity = state[id].opacity;
  const rawDefaultPosition = state[id].position;
  const defaultSize = state[id].size;
  const isLocked = state[id].locked;

  const [size, setSize] = useState({
    width: resizable ? defaultSize.width : minWidth,
    height: resizable ? defaultSize.height : minHeight,
  });
  const [isResizing, setIsResizing] = useState(false);

  const getClampedPosition = (pos: { x: number; y: number }) => {
    if (typeof window === "undefined") return pos;
    const maxX = window.innerWidth - size.width;
    const maxY = window.innerHeight - size.height;
    return {
      x: Math.max(0, Math.min(pos.x, maxX)),
      y: Math.max(0, Math.min(pos.y, maxY)),
    };
  };

  const defaultPosition = isLocked
    ? rawDefaultPosition
    : getClampedPosition(rawDefaultPosition);

  const draggableRef = useRef<HTMLDivElement>(null!);

  const onDragStop = useCallback(
    (position: { x: number; y: number }) => {
      state.setPosition(id, position);
    },
    [id, state.setPosition]
  );

  const { position, handleMouseDown, handleTouchStart } = useDrag({
    ref: draggableRef,
    defaultState: defaultPosition,
    onDragStop,
    isLocked,
  });

  const handleResize = (e: React.MouseEvent) => {
    if (!resizable || isLocked) return;

    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = size.width;
    const startHeight = size.height;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(
        minWidth,
        Math.min(
          maxWidth || window.innerWidth,
          startWidth + (e.clientX - startX)
        )
      );
      const newHeight = Math.max(
        minHeight,
        Math.min(
          maxHeight || window.innerHeight,
          startHeight + (e.clientY - startY)
        )
      );

      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleOpacityChange = () => {
    const currentIndex = OPACITY_LEVELS.indexOf(opacity);
    const nextIndex = (currentIndex + 1) % OPACITY_LEVELS.length;
    state.setOpacity(id, OPACITY_LEVELS[nextIndex]);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const onMouseDown = (e: React.MouseEvent) => {
    state.setCurrentWindowFocus(id);
    handleMouseDown(e as React.MouseEvent<HTMLElement, MouseEvent>);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    state.setCurrentWindowFocus(id);
    handleTouchStart(e as React.TouchEvent<HTMLElement>);
  };

  useEffect(() => {
    if (isResizing) return;
    state.setSize(id, { height: size.height, width: size.width });
  }, [size.height, size.width, isResizing]);

  const style = dynamicHeight
    ? {
        height: "auto",
        width: size.width,
      }
    : {
        width: size.width,
        height: size.height,
      };

  const handleLockToggle = () => {
    state.setLocked(id, !isLocked);
  };

  return (
    <div
      className="ll-pointer-events-auto ll-absolute"
      ref={draggableRef}
      style={{
        ...style,
        maxHeight,
        top: position.y,
        left: position.x,
        zIndex: state.currentWindowFocus === id ? 1 : 0,
      }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onWheel={(e) => e.stopPropagation()}
      onClick={handleClick}
    >
      <div
        className={cn(
          "ll-w-full ll-h-full ll-rounded-lg ll-border-solid ll-border ll-border-white/50 ll-p-1 !ll-relative ll-box-border ll-text-white ll-flex ll-flex-col",
          {
            "ll-bg-black/0": opacity === 1,
            "ll-bg-black/25": opacity === 2,
            "ll-bg-black/50": opacity === 3,
            "ll-bg-black/75": opacity === 4,
            "ll-bg-black": opacity === 5,
          }
        )}
      >
        {!disableTitle && (
          <div className="ll-flex ll-items-center ll-justify-between ll-px-1 ll-flex-shrink-0">
            <div className="ll-flex ll-items-center ll-gap-1">
              <div
                className="ll-opacity-button ll-custom-cursor-pointer ll-mt-0.5"
                onClick={handleOpacityChange}
              />
              {actions}
            </div>
            <div className="ll-background-[0_0] ll-line-height-[28px] ll-custom-cursor-pointer ll-absolute ll-left-1/2 ll-transform ll--translate-x-1/2 ll-flex ll-gap-2 ll-items-center">
              <p className="ll-text-[11px] ll-text-[beige] ll-text-shadow-[1px_1px_1px_black]">
                {title}
              </p>
              {isLocked ? (
                <PinOff
                  className="!ll-stroke-gray-400 ll-text-xs ll-absolute -ll-right-5 !hover:ll-stroke-gray-200"
                  size="14"
                  onClick={handleLockToggle}
                />
              ) : (
                <Pin
                  className="!ll-stroke-gray-400 ll-text-xs ll-absolute -ll-right-5 !hover:ll-stroke-gray-200"
                  size="14"
                  onClick={handleLockToggle}
                />
              )}
            </div>
            {closable && (
              <button
                type="button"
                className="ll-close-button ll-custom-cursor-pointer"
                onClick={onClose}
              />
            )}
          </div>
        )}
        <div className="ll-flex-1 ll-overflow-hidden">{children}</div>
        {resizable && !isLocked && (
          <div
            className="ll-absolute ll-bottom-0 ll-right-0 ll-w-4 ll-h-4 ll-cursor-se-resize ll-bg-transparent"
            onMouseDown={handleResize}
            style={{
              background:
                "linear-gradient(-45deg, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%)",
            }}
          />
        )}
      </div>
    </div>
  );
};
