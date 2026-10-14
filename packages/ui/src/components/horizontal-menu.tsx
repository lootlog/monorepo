import { useLayoutEffect, useRef, type ComponentProps } from "react";
import { useHorizontalWheelScroll } from "../hooks/use-horizontal-wheel-scroll";
import { cn } from "cn";
import { getPrefersReducedMotion } from "../hooks/use-prefers-reduced-motion";

export function HorizontalMenu({
  children,
  className,
  ...props
}: ComponentProps<"nav">) {
  const viewportRef = useRef<HTMLDivElement>(null);
  useHorizontalWheelScroll(viewportRef);
  const listRef = useRef<HTMLUListElement>(null);
  const highlightRef = useRef<HTMLLIElement>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    const highlight = highlightRef.current;

    if (!list || !highlight) return;
    const viewport = viewportRef.current;

    if (!viewport) return;

    const reveal = (element: HTMLElement) => {
      viewport.scrollTo({
        left:
          element.offsetLeft - (viewport.clientWidth - element.offsetWidth) / 2,
        behavior: getPrefersReducedMotion() ? "instant" : "smooth",
      });
    };

    let scrollFrame = 0;

    const scheduleReveal = (element: HTMLElement) => {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => reveal(element));
    };

    let previousActive: HTMLElement | null = null;

    const update = (recenter = false) => {
      const active = list.querySelector<HTMLElement>('a[aria-current="page"]');
      highlight.hidden = !active;
      const previous = previousActive;
      const activeChanged = active !== previous;
      previousActive = active;

      if (!active) return;

      if (activeChanged || recenter) scheduleReveal(active);
      // Slide only between two active items; first placement and layout
      // changes snap so the highlight never flies in from the list origin.
      const slide = activeChanged && previous !== null;

      if (!slide) highlight.style.transition = "none";
      highlight.style.width = `${active.offsetWidth}px`;
      highlight.style.transform = `translateX(${active.offsetLeft}px)`;

      if (!slide) {
        // Commit the snapped position before transitions are restored.
        void highlight.offsetWidth;
        highlight.style.transition = "";
      }
    };

    const onInteraction = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a");

      if (!link) return;
      scheduleReveal(link);
    };

    list.addEventListener("click", onInteraction);
    update();
    const resize = new ResizeObserver(() => update(true));
    resize.observe(list);
    resize.observe(viewport);
    const mutation = new MutationObserver(() => update());
    mutation.observe(list, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-current"],
    });

    return () => {
      list.removeEventListener("click", onInteraction);
      cancelAnimationFrame(scrollFrame);
      resize.disconnect();
      mutation.disconnect();
    };
  }, []);

  return (
    <nav className={cn("min-w-0 shrink-0", className)} {...props}>
      <div
        ref={viewportRef}
        className="h-full overflow-x-auto px-0 [scrollbar-width:none] sm:px-1 [&::-webkit-scrollbar]:hidden"
      >
        <ul
          ref={listRef}
          className="relative isolate flex h-full w-max min-w-full flex-nowrap [&>li]:shrink-0 [&>li>a]:relative [&>li>a]:z-10 [&>li>a]:flex [&>li>a]:h-full [&>li>a]:items-center [&>li>a]:whitespace-nowrap [&>li>a]:px-3"
        >
          <li
            ref={highlightRef}
            aria-hidden
            role="presentation"
            className="pointer-events-none absolute bottom-0 left-0 z-0 h-0.5 rounded-full bg-primary transition-[transform,width] duration-150 ease-emphasized motion-reduce:transition-none"
          />
          {children}
        </ul>
      </div>
    </nav>
  );
}
