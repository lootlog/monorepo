"use client";

import * as React from "react";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

import { cn } from "@lootlog/ui/lib/utils";

type ScrollAreaOrientation = "vertical" | "horizontal" | "both";

const ScrollArea = React.forwardRef<
  HTMLDivElement,
  ScrollAreaPrimitive.Root.Props & {
    onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
    orientation?: ScrollAreaOrientation;
  }
>(({ className, children, onScroll, orientation = "both", ...props }, ref) => {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={ref}
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 focus-visible:ring-[3px] size-full rounded-[inherit] transition-[color,box-shadow] outline-none"
        onScroll={onScroll}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {orientation !== "horizontal" && <ScrollBar />}
      {orientation !== "vertical" && <ScrollBar orientation="horizontal" />}
      {orientation === "both" && <ScrollAreaPrimitive.Corner />}
    </ScrollAreaPrimitive.Root>
  );
});

ScrollArea.displayName = "ScrollArea";

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none p-px transition-colors select-none",
        orientation === "vertical" &&
          "h-full w-2.5 border-l border-l-transparent border-r-transparent border-r-2",
        orientation === "horizontal" &&
          "h-2.5 flex-col border-t border-t-transparent",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="bg-border relative flex-1 rounded-full"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
