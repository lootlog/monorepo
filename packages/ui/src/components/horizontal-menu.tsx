import { useLayoutEffect, useRef, type ComponentProps } from "react";
import { useHorizontalWheelScroll } from "../hooks/use-horizontal-wheel-scroll";
import { cn } from "cn";

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
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
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
      const activeChanged = active !== previousActive;
      previousActive = active;
      if (!active) return;
      if (activeChanged || recenter) scheduleReveal(active);
      highlight.style.width = `${active.offsetWidth}px`;
      highlight.style.height = `${active.offsetHeight}px`;
      highlight.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
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
        className="overflow-x-auto rounded-2xl border border-border bg-card [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ul
          ref={listRef}
          className="relative isolate flex w-max min-w-full flex-nowrap gap-1 p-1 [&>li]:shrink-0 [&>li>a]:relative [&>li>a]:z-10 [&>li>a]:whitespace-nowrap [&>li>a]:rounded-[calc(var(--radius-2xl)-5px)] [&>li>a]:px-4 [&>li>a]:py-2"
        >
          <li
            ref={highlightRef}
            aria-hidden
            role="presentation"
            className="pointer-events-none absolute left-0 top-0 z-0 rounded-[calc(var(--radius-2xl)-5px)] bg-primary transition-[transform,width,height] duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
          />
          {children}
        </ul>
      </div>
    </nav>
  );
}
