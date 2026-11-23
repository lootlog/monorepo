import { useLayoutEffect, useRef } from "react";

export const useCountBump = <Element extends HTMLElement>(
  count: number,
  direction: "increase" | "decrease" = "increase",
) => {
  const elementRef = useRef<Element>(null);
  const previousCountRef = useRef(count);

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- DOM class that plays the bump animation when the count changes
  useLayoutEffect(() => {
    const previousCount = previousCountRef.current;
    previousCountRef.current = count;

    if (
      direction === "increase" ? count > previousCount : count < previousCount
    )
      elementRef.current?.classList.add("ll-count-bump");
  }, [count, direction]);

  return elementRef;
};
