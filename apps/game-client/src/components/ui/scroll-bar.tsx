import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import { cn } from "cn";

const scrollbarClassName =
  "ll:z-10 ll:flex ll:touch-none ll:select-none ll:rounded-full ll:bg-gray-600/60 ll:opacity-0 ll:pointer-events-none ll:transition-opacity ll:duration-100 ll:ease-out ll:data-[hovering]:opacity-100 ll:data-[hovering]:pointer-events-auto ll:data-[hovering]:duration-0 ll:data-[scrolling]:opacity-100 ll:data-[scrolling]:pointer-events-auto ll:data-[scrolling]:duration-0 ll-custom-cursor-pointer";

const thumbClassName =
  "ll:relative ll:flex-1 ll:rounded-full ll:bg-gray-300/80 ll:transition-colors ll:hover:bg-gray-200/90";

export function ScrollBar({
  orientation = "vertical",
}: {
  orientation?: "vertical" | "horizontal";
}) {
  return (
    <BaseScrollArea.Scrollbar
      orientation={orientation}
      className={cn(
        scrollbarClassName,
        orientation === "vertical"
          ? "ll:my-1 ll:mr-1 ll:h-[calc(100%-0.5rem)] ll:w-1"
          : "ll:mx-1 ll:mb-px ll:h-1 ll:w-[calc(100%-0.5rem)] ll:flex-col",
      )}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <BaseScrollArea.Thumb className={thumbClassName} />
    </BaseScrollArea.Scrollbar>
  );
}
