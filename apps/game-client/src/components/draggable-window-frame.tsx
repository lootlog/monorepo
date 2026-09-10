import { cn } from "cn";
import { WindowTitleBar } from "./window-title-bar";
import { WindowResizeHandle } from "./window-resize-handle";
import {
  useDraggableWindowFrame,
  type DraggableWindowFrameProps,
  MAX_HEIGHT_PREVIEW_LINE_HEIGHT,
} from "./use-draggable-window-frame";

const getWindowCursor = ({
  isLocked,
  isDragging,
}: {
  isLocked: boolean;
  isDragging: boolean;
}) => {
  if (isLocked) {
    return "default";
  }

  if (isDragging) {
    return "grabbing";
  }

  return "grab";
};

export function DraggableWindowFrame(props: DraggableWindowFrameProps) {
  const {
    children,
    id,
    actions,
    title,
    onClose,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
    isMaxHeightAdjustmentArmed,
    closable,
    disableTitle,
    draggableContent,
    contentClassName,
    animationPhase,
    onWindowAnimationEnd,
    opacity,
    isLocked,
    contentRef,
    windowBodyRef,
    titleBarRef,
    allowsHorizontalResize,
    allowsVerticalResize,
    isAdjustingMaxHeight,
    cssMaxContentHeight,
    previewBoundaryOffset,
    previewShadeOffset,
    style,
    draggableRef,
    position,
    isDragging,
    handleResize,
    handleResizeStart,
    handleResizeEnd,
    handleOpacityChange,
    handleClick,
    onPointerDown,
    onPointerDownCapture,
    handleLockToggle,
    zIndex,
  } = useDraggableWindowFrame(props);

  return (
    // This container only stops click bubbling into Margonem; child controls own keyboard actions.
    // oxlint-disable-next-line react-doctor/click-events-have-key-events, react-doctor/no-static-element-interactions
    <div
      aria-hidden={animationPhase === "exit" ? true : undefined}
      className="ll:pointer-events-auto ll:absolute"
      ref={draggableRef}
      data-ll-draggable-window={id}
      style={{
        ...style,
        maxWidth,
        maxHeight,
        top: position.y,
        left: position.x,
        zIndex,
        contain: "layout style",
        cursor: getWindowCursor({ isLocked, isDragging }),
        touchAction: disableTitle || draggableContent ? "none" : undefined,
        pointerEvents: animationPhase === "exit" ? "none" : undefined,
      }}
      onPointerDownCapture={onPointerDownCapture}
      onPointerDown={disableTitle ? onPointerDown : undefined}
      onWheel={(e) => e.stopPropagation()}
      onClick={handleClick}
      id={`ll-${id}`}
    >
      <div
        className={cn(
          "ll:w-full ll:h-full ll:rounded-lg ll:shadow-[2px_2px_3px_3px_rgba(12,13,13,0.4)] ll:border-solid ll:border ll:border-white/50 ll:p-1 ll:relative ll:box-border ll:text-white ll:flex ll:flex-col",
          {
            "ll-window-preparing": animationPhase === "preparing",
            "ll-window-enter": animationPhase === "enter",
            "ll-window-exit": animationPhase === "exit",
            "ll:bg-black/0": opacity === 1,
            "ll:bg-black/25": opacity === 2,
            "ll:bg-black/50": opacity === 3,
            "ll:bg-black/75": opacity === 4,
            "ll:bg-black": opacity === 5,
            "ll:border-blue-400/80 ll:ring-1 ll:ring-blue-400/60":
              isMaxHeightAdjustmentArmed,
          },
        )}
        ref={windowBodyRef}
        onAnimationEnd={(event) => {
          if (event.currentTarget !== event.target) return;

          if (animationPhase !== "enter" && animationPhase !== "exit") return;

          const expectedAnimationName = `ll-window-${animationPhase}`;

          if (event.animationName !== expectedAnimationName) return;

          onWindowAnimationEnd();
        }}
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
              onPointerDown={onPointerDown}
            />
          </div>
        )}
        <div
          ref={contentRef}
          className={cn(
            "ll:flex-1 ll:overflow-hidden ll:cursor-auto ll:relative",
            contentClassName,
          )}
          style={{ maxHeight: cssMaxContentHeight }}
          onPointerDown={
            draggableContent
              ? onPointerDown
              : (event) => event.stopPropagation()
          }
        >
          {isAdjustingMaxHeight && (
            <div
              data-ll-max-height-preview=""
              className="ll:pointer-events-none ll:absolute ll:inset-0 ll:z-10"
            >
              <div className="ll:absolute ll:inset-0 ll:bg-blue-500/8" />
              <div
                className="ll:absolute ll:left-0 ll:right-0 ll:bg-blue-400/20"
                style={{
                  top: previewShadeOffset,
                  bottom: 0,
                }}
              />
              <div
                className="ll:absolute ll:left-0 ll:right-0 ll:bg-blue-300/90 ll:shadow-[0_0_0_1px_rgba(147,197,253,0.45)]"
                style={{
                  top: previewBoundaryOffset,
                  height: MAX_HEIGHT_PREVIEW_LINE_HEIGHT,
                }}
              />
            </div>
          )}
          {children}
        </div>
        {(allowsHorizontalResize || allowsVerticalResize) && !isLocked && (
          <WindowResizeHandle
            minWidth={minWidth}
            minHeight={minHeight}
            maxWidth={maxWidth}
            maxHeight={maxHeight}
            allowHorizontalResize={allowsHorizontalResize}
            allowVerticalResize={allowsVerticalResize}
            onResize={handleResize}
            onResizeStart={handleResizeStart}
            onResizeEnd={handleResizeEnd}
          />
        )}
      </div>
    </div>
  );
}
