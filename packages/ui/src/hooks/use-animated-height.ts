import { useRef, type Ref, type RefCallback } from "react";

/** Short enough that a resize reads as a settle rather than a motion. */
const DURATION_MS = 160;

const EASING = "cubic-bezier(0.2, 0, 0, 1)";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const assignRef = <T>(ref: Ref<T> | undefined, value: T | null) => {
  if (!ref) return;

  if ("current" in ref) ref.current = value;
  else ref(value);
};

/**
 * Eases an element between heights when its content resizes it, so a popup
 * that swaps or grows its contents settles instead of jumping. A resize
 * observer reports the new layout height before it is painted; the element
 * eases from the old height to it and is then left at its natural height,
 * so the layout inside keeps working. A change mid-way eases from the height
 * on screen towards the new one. Skipped while the popup opens or closes,
 * under reduced motion and while a drawer is being swiped.
 */
export const useAnimatedHeight = <T extends HTMLElement>(
  forwardedRef?: Ref<T>,
): RefCallback<T> => {
  // Kept across renders, so re-attaching the observer to the same popup never
  // loses the height the next resize animates from. A popup mounted by a new
  // opening starts unmeasured instead of easing from the last one's height.
  const settled = useRef<{ element: T; height: number } | null>(null);

  return (element) => {
    assignRef(forwardedRef, element);

    // Test DOMs have neither observers nor Web Animations.
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

    // Content laid out while the popup opens (late fonts, fast data, lazy
    // chunks) belongs to its first height, not to a resize.
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
      // Each frame of a running animation resizes the element too.
      if (animation || !entry) return;

      const next = entry.borderBoxSize[0]?.blockSize ?? element.offsetHeight;
      const previous = settled.current?.height ?? null;

      settled.current = { element, height: next };

      if (previous === null || Math.abs(previous - next) < 1 || !canAnimate()) {
        return;
      }

      animateTo(previous, next);
    });

    // Content that changes during an animation moves the target: measure the
    // new natural height and ease there from the height on screen.
    const retarget = new MutationObserver(() => {
      if (!animation) return;

      const running = animation;
      const elapsed = running.currentTime;
      // The animated height, untouched by the popup's opening scale.
      const onScreen = Number.parseFloat(getComputedStyle(element).height);

      running.cancel();

      const natural = element.offsetHeight;

      settled.current = { element, height: natural };

      if (Math.abs(natural - target) < 1) {
        // Same destination: carry on from where the motion was.
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
