import { cn } from "@/lib/utils";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type PointerEvent,
} from "react";

export type NativeScrollAreaProps = ComponentPropsWithoutRef<"div"> & {
  orientation?: "vertical" | "horizontal" | "both";
  scrollbarVisibility?: "hover" | "always";
};

const parsePixelValue = (value: string) => Number.parseFloat(value) || 0;

const isPointerInScrollbarGutter = (
  event: PointerEvent<HTMLDivElement>,
  orientation: NonNullable<NativeScrollAreaProps["orientation"]>,
) => {
  const viewport = event.currentTarget;
  const computedStyle = window.getComputedStyle(viewport);
  const borderLeftWidth = parsePixelValue(computedStyle.borderLeftWidth);
  const borderRightWidth = parsePixelValue(computedStyle.borderRightWidth);
  const borderTopWidth = parsePixelValue(computedStyle.borderTopWidth);
  const borderBottomWidth = parsePixelValue(computedStyle.borderBottomWidth);
  const bounds = viewport.getBoundingClientRect();
  const verticalScrollbarWidth = Math.max(
    0,
    viewport.offsetWidth -
      viewport.clientWidth -
      borderLeftWidth -
      borderRightWidth,
  );
  const horizontalScrollbarHeight = Math.max(
    0,
    viewport.offsetHeight -
      viewport.clientHeight -
      borderTopWidth -
      borderBottomWidth,
  );
  const hasVerticalScrollbar =
    orientation !== "horizontal" && verticalScrollbarWidth > 0;
  const hasHorizontalScrollbar =
    orientation !== "vertical" && horizontalScrollbarHeight > 0;
  const isInVerticalScrollbar =
    hasVerticalScrollbar &&
    event.clientX >= bounds.right - borderRightWidth - verticalScrollbarWidth;
  const isInHorizontalScrollbar =
    hasHorizontalScrollbar &&
    event.clientY >=
      bounds.bottom - borderBottomWidth - horizontalScrollbarHeight;

  return isInVerticalScrollbar || isInHorizontalScrollbar;
};

export const NativeScrollArea = forwardRef<
  HTMLDivElement,
  NativeScrollAreaProps
>(
  (
    {
      className,
      onPointerDown,
      orientation = "vertical",
      scrollbarVisibility = "hover",
      ...props
    },
    ref,
  ) => {
    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
      onPointerDown?.(event);
      if (event.isPropagationStopped()) return;

      if (isPointerInScrollbarGutter(event, orientation)) {
        event.stopPropagation();
      }
    };

    return (
      <div
        {...props}
        ref={ref}
        data-ll-native-scroll-area=""
        className={cn(
          "ll:min-h-0 ll:min-w-0 ll:select-text ll:scrollbar-thin",
          scrollbarVisibility === "hover" &&
            "ll:scrollbar-thumb-transparent ll:scrollbar-track-transparent ll:hover:scrollbar-thumb-gray-400/50 ll:hover:scrollbar-track-gray-600/60",
          scrollbarVisibility === "always" &&
            "ll:scrollbar-thumb-gray-400/50 ll:scrollbar-track-gray-600/60",
          orientation === "vertical" &&
            "ll:overflow-y-auto ll:overflow-x-hidden ll:scrollbar-gutter-stable",
          orientation === "horizontal" &&
            "ll:overflow-x-auto ll:overflow-y-hidden",
          orientation === "both" &&
            "ll:overflow-auto ll:scrollbar-gutter-stable",
          className,
        )}
        onPointerDown={handlePointerDown}
      />
    );
  },
);

NativeScrollArea.displayName = "NativeScrollArea";
