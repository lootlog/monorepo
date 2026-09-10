import { ScrollArea as BaseScrollArea } from "@base-ui/react/scroll-area";
import { ScrollBar } from "./scroll-bar";
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

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  (
    { children, className, orientation = "vertical", viewportStyle, ...props },
    ref,
  ) => {
    const viewportRef = useRef<HTMLDivElement | null>(null);

    // React forwarded refs are either callbacks or mutable ref objects.
    const setViewportRef = (element: HTMLDivElement | null) => {
      viewportRef.current = element;

      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    };

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
          ref={setViewportRef}
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
        {orientation !== "horizontal" && <ScrollBar />}
        {orientation !== "vertical" && <ScrollBar orientation="horizontal" />}
        {orientation === "both" && <BaseScrollArea.Corner />}
      </BaseScrollArea.Root>
    );
  },
);

ScrollArea.displayName = "ScrollArea";
