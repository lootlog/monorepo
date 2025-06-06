import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    className={cn("ll-relative ll-overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport
      className="ll-h-full ll-w-full ll-rounded-[inherit]"
      ref={ref}
    >
      <style>
        {`
        [data-radix-scroll-area-viewport] div {
            display:block !important;
        }
        `}
      </style>
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    id="scrollbar"
    className={cn(
      "ll-flex ll-touch-none ll-select-none ll-transition-colors ll-bg-gray-600/60 ll-rounded-md",
      orientation === "vertical" &&
        "ll-h-full ll-w-1.5 ll-border-l ll-border-l-transparent ll-p-[1px]",
      orientation === "horizontal" &&
        "ll-h-1.5 ll-flex-col ll-border-t ll-border-t-transparent ll-p-[1px]",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="ll-relative ll-flex-1 ll-rounded-sm ll-bg-gray-400/50" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
