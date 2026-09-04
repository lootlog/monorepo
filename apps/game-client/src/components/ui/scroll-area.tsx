import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import { cn } from "cn";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  useEffect,
  useRef,
} from "react";

type ScrollAreaOrientation = "vertical" | "horizontal" | "both";

export type ScrollAreaProps = Omit<
  ComponentPropsWithoutRef<typeof BaseScrollArea.Root>,
  "className"
> & {
  className?: string;
  orientation?: ScrollAreaOrientation;
  viewportStyle?: CSSProperties;
};

const scrollbarClassName =
  "ll:z-10 ll:flex ll:touch-none ll:select-none ll:rounded-full ll:bg-gray-600/60 ll:opacity-0 ll:pointer-events-none ll:transition-opacity ll:duration-100 ll:ease-out ll:data-[hovering]:opacity-100 ll:data-[hovering]:pointer-events-auto ll:data-[hovering]:duration-0 ll:data-[scrolling]:opacity-100 ll:data-[scrolling]:pointer-events-auto ll:data-[scrolling]:duration-0 ll-custom-cursor-pointer";

const thumbClassName =
  "ll:relative ll:flex-1 ll:rounded-full ll:bg-gray-300/80 ll:transition-colors ll:hover:bg-gray-200/90";

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    { children, className, orientation = "vertical", viewportStyle, ...props },
    ref,
  ) => {
    const viewportRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport || orientation !== "horizontal") return;

      const handleWheel = (event: WheelEvent) => {
        if (
          event.deltaY === 0 ||
          Math.abs(event.deltaX) >= Math.abs(event.deltaY)
        ) {
          return;
        }

        const maximumScrollLeft = Math.max(
          0,
          viewport.scrollWidth - viewport.clientWidth,
        );
        const nextScrollLeft = Math.min(
          maximumScrollLeft,
          Math.max(0, viewport.scrollLeft + event.deltaY),
        );
        if (nextScrollLeft === viewport.scrollLeft) return;

        event.preventDefault();
        viewport.scrollLeft = nextScrollLeft;
      };

      viewport.addEventListener("wheel", handleWheel, { passive: false });
      return () => viewport.removeEventListener("wheel", handleWheel);
    }, [orientation]);

    const overflowStyle: CSSProperties = {
      overflowX: orientation === "vertical" ? "hidden" : "scroll",
      overflowY: orientation === "horizontal" ? "hidden" : "scroll",
    };
    const contentStyle: CSSProperties | undefined =
      orientation === "vertical" ? { minWidth: 0, width: "100%" } : undefined;

    return (
      <BaseScrollArea.Root
        {...props}
        className={cn(
          "ll:relative ll:min-h-0 ll:min-w-0 ll:overflow-hidden",
          className,
        )}
      >
        <BaseScrollArea.Viewport
          ref={(element) => {
            viewportRef.current = element;
            if (typeof ref === "function") {
              ref(element);
            } else if (ref) {
              ref.current = element;
            }
          }}
          data-ll-scroll-area-viewport=""
          className="ll:h-full ll:w-full ll:max-h-[inherit] ll:rounded-[inherit] ll:select-text"
          style={{ ...overflowStyle, ...viewportStyle }}
        >
          <BaseScrollArea.Content
            className="ll:min-h-full"
            style={contentStyle}
          >
            {children}
          </BaseScrollArea.Content>
        </BaseScrollArea.Viewport>
        {orientation !== "horizontal" && (
          <BaseScrollArea.Scrollbar
            className={cn(
              scrollbarClassName,
              "ll:my-1 ll:mr-1 ll:h-[calc(100%-0.5rem)] ll:w-1",
            )}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <BaseScrollArea.Thumb className={thumbClassName} />
          </BaseScrollArea.Scrollbar>
        )}
        {orientation !== "vertical" && (
          <BaseScrollArea.Scrollbar
            orientation="horizontal"
            className={cn(
              scrollbarClassName,
              "ll:mx-1 ll:mb-px ll:h-1 ll:w-[calc(100%-0.5rem)] ll:flex-col",
            )}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <BaseScrollArea.Thumb className={thumbClassName} />
          </BaseScrollArea.Scrollbar>
        )}
        {orientation === "both" && <BaseScrollArea.Corner />}
      </BaseScrollArea.Root>
    );
  },
);

ScrollArea.displayName = "ScrollArea";
