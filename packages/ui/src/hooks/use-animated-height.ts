import { useRef, type Ref, type RefCallback } from "react";

const DURATION_MS = 160;

const EASING = "cubic-bezier(0.2, 0, 0, 1)";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const assignRef = <T>(ref: Ref<T> | undefined, value: T | null) => {
  if (!ref) return;

  if ("current" in ref) ref.current = value;
  else ref(value);
};

export const useAnimatedHeight = <T extends HTMLElement>(
  forwardedRef?: Ref<T>,
): RefCallback<T> => {
  const settled = useRef<{ element: T; height: number } | null>(null);

  return (element) => {
    assignRef(forwardedRef, element);

    if (
      !element ||
      !("ResizeObserver" in globalThis) ||
      !("animate" in element)
    ) {
      return;
    }

    if (settled.current?.element !== element) settled.current = null;

    let animation: Animation | null = null;
    let target = 0;

    const animateTo = (from: number, to: number) => {
      target = to;

      const current = element.animate(
        [
          { height: `${from}px`, overflow: "hidden" },
          { height: `${to}px`, overflow: "hidden" },
        ],
        { duration: DURATION_MS, easing: EASING },
      );

      animation = current;
      current.addEventListener("finish", () => {
        if (animation === current) animation = null;
      });
    };

    const isTransitioning = () =>
      element.hasAttribute("data-starting-style") ||
      element.hasAttribute("data-ending-style") ||
      element
        .getAnimations()
        .some((running) => running instanceof CSSTransition);

    const canAnimate = () =>
      !window.matchMedia?.(REDUCED_MOTION_QUERY).matches &&
      !element.hasAttribute("data-swiping") &&
      !isTransitioning();

    const observer = new ResizeObserver(([entry]) => {
      if (animation || !entry) return;

      const next = entry.borderBoxSize[0]?.blockSize ?? element.offsetHeight;
      const previous = settled.current?.height ?? null;

      settled.current = { element, height: next };

      if (previous === null || Math.abs(previous - next) < 1 || !canAnimate()) {
        return;
      }

      animateTo(previous, next);
    });

    const retarget = new MutationObserver(() => {
      if (!animation) return;

      const running = animation;
      const elapsed = running.currentTime;
      const onScreen = Number.parseFloat(getComputedStyle(element).height);

      running.cancel();

      const natural = element.offsetHeight;

      settled.current = { element, height: natural };

      if (Math.abs(natural - target) < 1) {
        running.currentTime = elapsed;
        running.play();

        return;
      }

      animateTo(onScreen, natural);
    });

    observer.observe(element);
    retarget.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      retarget.disconnect();
      animation?.cancel();
      assignRef(forwardedRef, null);
    };
  };
};
