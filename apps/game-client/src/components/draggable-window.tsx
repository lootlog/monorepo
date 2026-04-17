import { useDrag } from "@/hooks/ui/use-drag";
import { cn } from "@/lib/utils";
import {
  useWindowsStore,
  type WindowId,
  type WindowOpacity,
} from "@/store/windows.store";
import {
  type FC,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { WindowTitleBar } from "./window-title-bar";
import {
  cancelWindowResizeSession,
  WindowResizeHandle,
} from "./window-resize-handle";

type DraggableWindowProps = {
  children: React.ReactNode;
  id: WindowId;
  actions?: React.ReactNode;
  title: string;
  onClose?: () => void;
  variant?: "default" | "small";
  heightMode?: "fixed" | "auto-up-to-max";
  resizable?: boolean;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  maxContentHeight?: number;
  isMaxHeightAdjustmentArmed?: boolean;
  onMaxHeightAdjustmentArmedChange?: (armed: boolean) => void;
  onMaxContentHeightChange?: (height: number) => void;
  onResolvedMaxContentHeightChange?: (height: number) => void;
  dynamicHeight?: boolean;
  closable?: boolean;
  disableTitle?: boolean;
  draggableContent?: boolean;
  contentClassName?: string;
};

export const DraggableWindow: FC<DraggableWindowProps> = ({
  children,
  id,
  actions,
  title,
  onClose,
  variant = "small",
  heightMode = "fixed",
  resizable = true,
  minWidth = 242,
  minHeight = 240,
  maxWidth,
  maxHeight,
  maxContentHeight,
  isMaxHeightAdjustmentArmed = false,
  onMaxHeightAdjustmentArmedChange,
  onMaxContentHeightChange,
  onResolvedMaxContentHeightChange,
  dynamicHeight = false,
  closable = true,
  disableTitle = false,
  draggableContent = false,
  contentClassName,
}) => {
  const { opacity, rawDefaultPosition, defaultSize, isLocked } =
    useWindowsStore(
      useShallow((state) => ({
        opacity: state[id].opacity,
        rawDefaultPosition: state[id].position,
        defaultSize: state[id].size,
        isLocked: state[id].locked,
      })),
    );
  const windowFocusHistory = useWindowsStore(
    (state) => state.windowFocusHistory,
  );

  const setPositionInStore = useWindowsStore((state) => state.setPosition);
  const setSizeInStore = useWindowsStore((state) => state.setSize);
  const setOpacityInStore = useWindowsStore((state) => state.setOpacity);
  const setLockedInStore = useWindowsStore((state) => state.setLocked);
  const setCurrentWindowFocus = useWindowsStore(
    (state) => state.setCurrentWindowFocus,
  );

  const [localSize, setLocalSize] = useState({
    width: resizable ? defaultSize.width : minWidth,
    height: resizable ? defaultSize.height : minHeight,
  });
  const [isResizing, setIsResizing] = useState(false);
  const [autoHeight, setAutoHeight] = useState(minHeight);
  const contentRef = useRef<HTMLDivElement>(null);
  const windowBodyRef = useRef<HTMLDivElement>(null);
  const titleBarRef = useRef<HTMLDivElement>(null);
  const isAutoHeightMode = heightMode === "auto-up-to-max";
  const effectiveHeight = isAutoHeightMode ? autoHeight : localSize.height;

  const getClampedPosition = useCallback(
    (pos: { x: number; y: number }) => {
      if (typeof window === "undefined") return pos;
      const maxX = window.innerWidth - localSize.width;
      const maxY = window.innerHeight - effectiveHeight;
      return {
        x: Math.max(0, Math.min(pos.x, maxX)),
        y: Math.max(0, Math.min(pos.y, maxY)),
      };
    },
    [effectiveHeight, localSize.width],
  );

  const defaultPosition = isLocked
    ? rawDefaultPosition
    : getClampedPosition(rawDefaultPosition);

  const draggableRef = useRef<HTMLDivElement>(null!);

  const onDragStop = useCallback(
    (position: { x: number; y: number }) => {
      setPositionInStore(id, position);
    },
    [id, setPositionInStore],
  );

  const {
    position,
    handleMouseDown,
    handleTouchStart,
    isDragging,
    cancelDrag,
  } = useDrag({
    ref: draggableRef,
    defaultState: defaultPosition,
    onDragStop,
    isLocked,
  });

  const handleResize = useCallback(
    (newSize: { width: number; height: number }) => {
      if (
        isAutoHeightMode &&
        isMaxHeightAdjustmentArmed &&
        onMaxContentHeightChange
      ) {
        const windowBody = windowBodyRef.current;
        const contentElement = contentRef.current;

        if (!windowBody || !contentElement) {
          return;
        }

        const chromeHeight = windowBody.offsetHeight - contentElement.clientHeight;
        const nextMaxContentHeight = Math.max(
          1,
          Math.round(newSize.height - chromeHeight),
        );

        onMaxContentHeightChange(nextMaxContentHeight);
        return;
      }

      setLocalSize(newSize);
    },
    [
      isAutoHeightMode,
      isMaxHeightAdjustmentArmed,
      onMaxContentHeightChange,
    ],
  );

  const handleResizeStart = useCallback(() => {
    cancelDrag();
    setCurrentWindowFocus(id);
    setIsResizing(true);
  }, [cancelDrag, id, setCurrentWindowFocus]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    if (isMaxHeightAdjustmentArmed) {
      onMaxHeightAdjustmentArmedChange?.(false);
    }
  }, [isMaxHeightAdjustmentArmed, onMaxHeightAdjustmentArmedChange]);

  const handleOpacityChange = useCallback(
    (newOpacity: WindowOpacity) => {
      setOpacityInStore(id, newOpacity);
    },
    [id, setOpacityInStore],
  );

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      cancelWindowResizeSession();
      handleMouseDown(e as React.MouseEvent<HTMLElement, MouseEvent>);
    },
    [handleMouseDown],
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      cancelWindowResizeSession();
      handleTouchStart(e as React.TouchEvent<HTMLElement>);
    },
    [handleTouchStart],
  );

  const onMouseDownCapture = useCallback(() => {
    setCurrentWindowFocus(id);
  }, [id, setCurrentWindowFocus]);

  const onTouchStartCapture = useCallback(() => {
    setCurrentWindowFocus(id);
  }, [id, setCurrentWindowFocus]);

  useEffect(() => {
    if (isResizing) return;
    setSizeInStore(id, { height: localSize.height, width: localSize.width });
  }, [localSize.height, localSize.width, isResizing, id, setSizeInStore]);

  useLayoutEffect(() => {
    if (!isAutoHeightMode) {
      setAutoHeight(minHeight);
      return;
    }

    const updateAutoHeight = () => {
      const windowBody = windowBodyRef.current;
      const contentElement = contentRef.current;

      if (!windowBody || !contentElement) {
        return;
      }

      const chromeHeight = windowBody.offsetHeight - contentElement.clientHeight;
      const resolvedMaxContentHeight =
        maxContentHeight ?? Math.max(0, localSize.height - chromeHeight);
      onResolvedMaxContentHeightChange?.(Math.round(resolvedMaxContentHeight));
      const nextAutoHeight = Math.max(
        minHeight,
        Math.min(
          chromeHeight + contentElement.scrollHeight,
          chromeHeight + resolvedMaxContentHeight,
        ),
      );

      setAutoHeight((currentHeight) => {
        if (Math.abs(currentHeight - nextAutoHeight) < 1) {
          return currentHeight;
        }

        return nextAutoHeight;
      });
    };

    updateAutoHeight();

    const resizeObserver = new ResizeObserver(updateAutoHeight);

    if (windowBodyRef.current) {
      resizeObserver.observe(windowBodyRef.current);
    }

    if (titleBarRef.current) {
      resizeObserver.observe(titleBarRef.current);
    }

    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
      const contentRoot = contentRef.current.firstElementChild;

      if (contentRoot instanceof HTMLElement) {
        resizeObserver.observe(contentRoot);
      }
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    isAutoHeightMode,
    localSize.height,
    maxContentHeight,
    minHeight,
    onResolvedMaxContentHeightChange,
  ]);

  const style = dynamicHeight
    ? { height: "auto", width: localSize.width }
    : { width: localSize.width, height: effectiveHeight };

  const handleLockToggle = useCallback(() => {
    setLockedInStore(id, !isLocked);
  }, [id, isLocked, setLockedInStore]);

  const windowZIndex = windowFocusHistory.indexOf(id);
  const zIndex =
    windowZIndex === -1 ? 0 : windowFocusHistory.length - windowZIndex;

  return (
    <div
      className="ll:pointer-events-auto ll:absolute"
      ref={draggableRef}
      data-ll-draggable-window={id}
      style={{
        ...style,
        maxHeight,
        top: position.y,
        left: position.x,
        zIndex,
        cursor: isLocked ? "default" : isDragging ? "grabbing" : "grab",
      }}
      onMouseDownCapture={onMouseDownCapture}
      onTouchStartCapture={onTouchStartCapture}
      onMouseDown={onMouseDown}
      onTouchStart={disableTitle ? onTouchStart : undefined}
      onWheel={(e) => e.stopPropagation()}
      onClick={handleClick}
      id={`ll-${id}`}
    >
      <div
        className={cn(
          "ll:w-full ll:h-full ll:rounded-lg ll:border-solid ll:border ll:border-white/50 ll:p-1 ll:relative ll:box-border ll:text-white ll:flex ll:flex-col",
          {
            "ll:bg-black/0": opacity === 1,
            "ll:bg-black/25": opacity === 2,
            "ll:bg-black/50": opacity === 3,
            "ll:bg-black/75": opacity === 4,
            "ll:bg-black": opacity === 5,
          },
        )}
        ref={windowBodyRef}
      >
        {!disableTitle && (
          <div ref={titleBarRef}>
            <WindowTitleBar
              title={title}
              actions={actions}
              closable={closable}
              opacity={opacity}
              isLocked={isLocked}
              onOpacityChange={handleOpacityChange}
              onLockToggle={handleLockToggle}
              onClose={onClose}
              onTouchStart={onTouchStart}
            />
          </div>
        )}
        <div
          ref={contentRef}
          className={cn(
            "ll:flex-1 ll:overflow-hidden ll:cursor-auto",
            contentClassName,
          )}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={
            draggableContent ? onMouseDown : (e) => e.stopPropagation()
          }
        >
          {children}
        </div>
        {(resizable || isMaxHeightAdjustmentArmed) && !isLocked && (
          <WindowResizeHandle
            minWidth={minWidth}
            minHeight={minHeight}
            maxWidth={maxWidth}
            maxHeight={maxHeight}
            onResize={handleResize}
            onResizeStart={handleResizeStart}
            onResizeEnd={handleResizeEnd}
          />
        )}
      </div>
    </div>
  );
};
