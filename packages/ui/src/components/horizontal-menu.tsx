import { useLayoutEffect, useRef, type ComponentProps } from "react";
import { cn } from "cn";

export function HorizontalMenu({
  children,
  className,
  ...props
}: ComponentProps<"nav">) {
  const listRef = useRef<HTMLUListElement>(null);
  const highlightRef = useRef<HTMLLIElement>(null);
  useLayoutEffect(() => {
    const list = listRef.current;
    const highlight = highlightRef.current;
    if (!list || !highlight) return;
    const update = () => {
      const active = list.querySelector<HTMLElement>('a[aria-current="page"]');
      highlight.hidden = !active;
      if (!active) return;
      highlight.style.width = `${active.offsetWidth}px`;
      highlight.style.height = `${active.offsetHeight}px`;
      highlight.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
    };
    update();
    const resize = new ResizeObserver(update);
    resize.observe(list);
    const mutation = new MutationObserver(update);
    mutation.observe(list, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["aria-current"],
    });
    return () => {
      resize.disconnect();
      mutation.disconnect();
    };
  }, []);
  return (
    <nav className={cn("min-w-0 shrink-0", className)} {...props}>
      <ul
        ref={listRef}
        className="relative isolate flex min-w-0 flex-wrap gap-1 rounded-2xl border border-border bg-card p-1 [&>li>a]:rounded-[calc(var(--radius-2xl)-5px)] [&>li>a]:px-4 [&>li>a]:py-2"
      >
        <li
          ref={highlightRef}
          aria-hidden
          role="presentation"
          className="pointer-events-none absolute left-0 top-0 -z-10 rounded-[calc(var(--radius-2xl)-5px)] bg-primary transition-[transform,width,height] duration-150 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none"
        />
        {children}
      </ul>
    </nav>
  );
}
