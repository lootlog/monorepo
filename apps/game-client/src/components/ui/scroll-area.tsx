import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    className={cn("ll:relative ll:overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport
      className="ll:h-full ll:w-full ll:max-h-[inherit] ll:rounded-[inherit] ll:select-text ll:[&>div:first-child]:!block"
      ref={ref}
    >
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
    onMouseDown={(evt) => {
      evt.stopPropagation();
    }}
    className={cn(
      "ll:flex ll:touch-none ll:select-none ll:transition-colors ll-custom-cursor-pointer ll:bg-gray-600/60 ll:rounded-md",
      orientation === "vertical" &&
        "ll:h-[calc(100%-0.5rem)] ll:w-1 ll:mr-1 ll:my-1",
      orientation === "horizontal" &&
        "ll:w-[calc(100%-0.5rem)] ll:h-1 ll:flex-col ll:mb-1 ll:mx-1",
      className,
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb className="ll:relative ll:flex-1 ll:rounded-sm ll:bg-gray-400/50" />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
