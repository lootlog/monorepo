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
 * on screen towards the new one. Skipped under reduced motion and while a
 * drawer is being swiped.
 */
export const useAnimatedHeight = <T extends HTMLElement>(
  forwardedRef?: Ref<T>,
): RefCallback<T> => {
  // Kept across renders, so re-attaching the observer never loses the height
  // the next resize animates from.
  const settledHeight = useRef<number | null>(null);

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

    const canAnimate = () =>
      !window.matchMedia?.(REDUCED_MOTION_QUERY).matches &&
      !element.hasAttribute("data-swiping");

    const observer = new ResizeObserver(([entry]) => {
      // Each frame of a running animation resizes the element too.
      if (animation || !entry) return;

      const next = entry.borderBoxSize[0]?.blockSize ?? element.offsetHeight;
      const previous = settledHeight.current;

      settledHeight.current = next;

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

      settledHeight.current = natural;

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
