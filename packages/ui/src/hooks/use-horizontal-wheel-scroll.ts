import { useEffect, type RefObject } from "react";

export function useHorizontalWheelScroll(
  ref: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    const viewport = ref.current;
    if (!viewport) return;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY))
        return;
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? viewport.clientWidth
            : 1;
      const next = Math.max(
        0,
        Math.min(
          viewport.scrollWidth - viewport.clientWidth,
          viewport.scrollLeft + event.deltaY * unit,
        ),
      );
      if (next === viewport.scrollLeft) return;
      event.preventDefault();
      viewport.scrollLeft = next;
    };
    viewport.addEventListener("wheel", onWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", onWheel);
  }, [ref]);
}
