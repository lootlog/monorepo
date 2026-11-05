import { useRef, type Ref, type RefCallback } from "react";

/**
 * A critically damped spring, the motion of a system sheet resizing: quick
 * to respond, settling without overshoot. `response` is the period in seconds.
 */
const SPRING_RESPONSE = 0.38;

/** When the spring is within 0.2% of its target, so the tail is invisible. */
const SPRING_DURATION_MS = 480;

const SPRING_SAMPLES = 40;

const FRAME_MS = 1000 / 60;

const FALLBACK_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const OMEGA = (2 * Math.PI) / SPRING_RESPONSE;

/**
 * The spring as an easing from one height to another: `rate` is the starting
 * velocity divided by the distance (1/s), so a motion that turns mid-way
 * keeps its momentum. The displacement from the target follows
 * d(t) = (d0 + (v0 + ωd0)t)e^(-ωt).
 */
const springEasing = (rate: number) => {
  const seconds = SPRING_DURATION_MS / 1000;

  const points = Array.from({ length: SPRING_SAMPLES + 1 }, (_, index) => {
    const t = (index / SPRING_SAMPLES) * seconds;

    const progress =
      index === SPRING_SAMPLES
        ? 1
        : 1 - (1 + (rate + OMEGA) * t) * Math.exp(-OMEGA * t);

    return progress.toFixed(4);
  });

  const easing = `linear(${points.join(", ")})`;

  return "CSS" in globalThis &&
    CSS.supports("animation-timing-function", easing)
    ? easing
    : FALLBACK_EASING;
};

/** The velocity (px/s) of a spring that started at `distance` with `velocity`, after `seconds`. */
const springVelocity = (distance: number, velocity: number, seconds: number) =>
  Math.exp(-OMEGA * seconds) *
  (velocity - OMEGA * seconds * (velocity + OMEGA * distance));

let restingEasing: string | undefined;

const assignRef = <T>(ref: Ref<T> | undefined, value: T | null) => {
  if (!ref) return;

  if ("current" in ref) ref.current = value;
  else ref(value);
};

/**
 * Eases an element between heights when its content resizes it, so a popup
 * that swaps or grows its contents glides instead of jumping. A resize
 * observer reports the new layout height before it is painted; the element
 * springs from the old height to it and is then left at its natural height,
 * so the layout inside keeps working. A change mid-way turns the motion from
 * where it is towards the new height. Skipped under reduced motion and while
 * a drawer is being swiped.
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
    // The running spring's start, for its velocity when it is turned.
    let distance = 0;
    let velocity = 0;

    const animateTo = (from: number, to: number, startVelocity = 0) => {
      target = to;
      distance = from - to;
      velocity = startVelocity;

      const easing =
        startVelocity === 0
          ? (restingEasing ??= springEasing(0))
          : springEasing(startVelocity / distance);

      const current = element.animate(
        [
          { height: `${from}px`, overflow: "hidden" },
          { height: `${to}px`, overflow: "hidden" },
        ],
        { duration: SPRING_DURATION_MS, easing },
      );

      animation = current;
      current.addEventListener("finish", () => {
        if (animation === current) animation = null;
      });

      return current;
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
    // new natural height and spring there from the height on screen.
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

      const seconds = Number(elapsed ?? 0) / 1000;

      const turned = animateTo(
        onScreen,
        natural,
        springVelocity(distance, velocity, seconds),
      );

      // A new animation paints its first frame where the old one stood;
      // starting a frame in keeps the motion from pausing at the turn.
      turned.currentTime = FRAME_MS;
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
