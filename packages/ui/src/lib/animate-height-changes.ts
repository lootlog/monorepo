import { getPrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";

const HEIGHT_ANIMATION: KeyframeAnimationOptions = {
  duration: 200,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
};

const readHeight = (element: HTMLElement) =>
  Number.parseFloat(getComputedStyle(element).height);

/**
 * Ref callback that animates an auto-height element from its previous height
 * to the new one whenever its content changes. Mutations are handled before
 * paint, so the new height never flashes; other resizes, such as a viewport
 * change, only move the starting point of the next animation.
 */
export function animateHeightChanges(element: HTMLElement | null) {
  // jsdom implements neither API.
  if (!element || !("animate" in element) || !("ResizeObserver" in window)) {
    return;
  }

  const { overflow, alignContent } = element.style;
  let settledHeight = readHeight(element);
  let animation: Animation | undefined;

  const finish = () => {
    animation = undefined;
    element.style.overflow = overflow;
    element.style.alignContent = alignContent;
  };

  const resizeObserver = new ResizeObserver(() => {
    if (!animation) settledHeight = readHeight(element);
  });

  const mutationObserver = new MutationObserver(() => {
    if (
      getPrefersReducedMotion() ||
      element.closest("[data-ending-style]") !== null
    ) {
      return;
    }

    const running = animation;
    const target = settledHeight;
    const from = running ? readHeight(element) : target;

    // Detach the running animation to read the content height beneath it
    // without pausing it.
    const effect =
      running?.effect instanceof KeyframeEffect ? running.effect : undefined;

    if (effect) effect.target = null;

    const to = readHeight(element);

    if (effect) effect.target = element;

    // A running animation whose target did not move still fits.
    if (running && Math.abs(to - target) < 1) return;

    settledHeight = to;
    running?.cancel();

    if (Math.abs(to - from) >= 1) {
      // Clip the content and keep grid tracks at their own size while the
      // element is shorter or taller than its content.
      element.style.overflow = "hidden";
      element.style.alignContent = "start";
      animation = element.animate(
        { height: [`${from}px`, `${to}px`] },
        HEIGHT_ANIMATION,
      );
      animation.onfinish = finish;
    } else if (running) {
      finish();
    }

    // Drop the records produced by the inline style writes above.
    mutationObserver.takeRecords();
  });

  resizeObserver.observe(element);
  mutationObserver.observe(element, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });

  return () => {
    resizeObserver.disconnect();
    mutationObserver.disconnect();

    if (animation) {
      animation.cancel();
      finish();
    }
  };
}
