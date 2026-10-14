import { cn } from "cn";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * Wraps a table that may be wider than its card. It scrolls sideways only
 * while the table overflows: any scrolling box traps sticky content, so a
 * table that fits keeps its sticky header pinned to the page scroller.
 */
export const TableScroller = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const scroller = ref.current;

    if (!scroller) return;

    const update = () =>
      setOverflows(scroller.scrollWidth > scroller.clientWidth + 1);

    update();

    const observer = new ResizeObserver(update);

    observer.observe(scroller);

    if (scroller.firstElementChild)
      observer.observe(scroller.firstElementChild);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        overflows ? "overflow-x-auto" : "overflow-x-clip",
        className,
      )}
    >
      {children}
    </div>
  );
};
