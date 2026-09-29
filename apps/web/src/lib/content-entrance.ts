import { getPrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";

/** The keyframe every loading placeholder reveals itself with after its delay. */
const PLACEHOLDER_REVEAL_ANIMATION = "placeholder-in";

const FADE_DURATION_MS = 240;

const LIFT = "translateY(8px)";

const LIFT_DURATION_MS = 450;

/** Ease-out cubic: the lift stays visible after the fade has mostly finished. */
const LIFT_EASING = "cubic-bezier(0.33, 1, 0.68, 1)";

/** How deep a page-sized block is searched for smaller blocks to lift. */
const LIFT_SEARCH_DEPTH = 3;

/** Tailwind's `fixed` in any variant, and the `table-fixed` false positive. */
const FIXED_POSITION_SELECTOR = '[class*="fixed"]';

const STAGGER_STEP_MS = 30;

const STAGGERED_SIBLINGS = 3;

/**
 * Content that replaces a loading placeholder the player actually saw settles
 * into place. Content that arrives before any placeholder showed, such as a
 * cached or fast navigation, appears at once and never fades.
 *
 * A placeholder counts as seen once its delayed reveal animation starts. While
 * a seen placeholder is on screen, a mutation observer pairs its removal with
 * the elements the same commit inserts into the same parent.
 */
export const startContentEntrance = (root: HTMLElement) => {
  const seenPlaceholders = new Set<Element>();
  let isObserving = false;

  const observer = new MutationObserver((records) => {
    const handoffParents = new Set<Node>();

    for (const record of records) {
      for (const node of record.removedNodes) {
        if (containsAny(node, seenPlaceholders)) {
          handoffParents.add(record.target);
        }
      }
    }

    for (const placeholder of seenPlaceholders) {
      if (!placeholder.isConnected) seenPlaceholders.delete(placeholder);
    }

    if (seenPlaceholders.size === 0) {
      observer.disconnect();
      isObserving = false;
    }

    if (handoffParents.size === 0 || getPrefersReducedMotion()) return;

    const enteringByParent = new Map<Node, Set<HTMLElement>>();

    for (const record of records) {
      if (!handoffParents.has(record.target)) continue;

      for (const node of record.addedNodes) {
        if (!(node instanceof HTMLElement) || !node.isConnected) continue;

        const entering = enteringByParent.get(record.target) ?? new Set();

        entering.add(node);
        enteringByParent.set(record.target, entering);
      }
    }

    playEntrances(
      [...enteringByParent.values()].map((entering) => [...entering]),
    );
  });

  root.addEventListener("animationstart", (event) => {
    if (
      event.animationName !== PLACEHOLDER_REVEAL_ANIMATION ||
      !(event.target instanceof Element)
    ) {
      return;
    }

    seenPlaceholders.add(event.target);

    if (!isObserving) {
      observer.observe(root, { childList: true, subtree: true });
      isObserving = true;
    }
  });
};

const containsAny = (node: Node, elements: Set<Element>) => {
  for (const element of elements) {
    if (node.contains(element)) return true;
  }

  return false;
};

/**
 * Siblings entering together are staggered, but only the first few. Each
 * entering element fades, and it or the blocks inside it lift into place.
 */
const playEntrances = (siblingGroups: HTMLElement[][]) => {
  const easing = getComputedStyle(document.documentElement).getPropertyValue(
    "--ease-emphasized",
  );

  const liftLimit = window.innerHeight / 2;

  // Every height is read before any animation starts so the page lays out once.
  const entrances = siblingGroups.flatMap((siblings) =>
    siblings.map((element, index) => ({
      element,
      delay: getStaggerDelay(index),
      lifted: findLiftTargets(element, liftLimit, 0),
    })),
  );

  for (const { element, delay, lifted } of entrances) {
    element.animate([{ offset: 0, opacity: 0 }], {
      delay,
      duration: FADE_DURATION_MS,
      easing,
      fill: "backwards",
    });

    lifted.forEach((target, index) => {
      target.animate([{ offset: 0, transform: LIFT }], {
        delay: delay + getStaggerDelay(index),
        duration: LIFT_DURATION_MS,
        easing: LIFT_EASING,
        fill: "backwards",
      });
    });
  }
};

const getStaggerDelay = (index: number) =>
  Math.min(index, STAGGERED_SIBLINGS - 1) * STAGGER_STEP_MS;

/**
 * A transform makes an element the containing block of its fixed-position
 * descendants, so a block holding a floating button or bar never lifts as a
 * whole, and neither does a page-sized block: the blocks inside them lift one
 * by one instead, which also reads better than one large slab moving.
 */
const findLiftTargets = (
  element: Element,
  liftLimit: number,
  depth: number,
): Element[] => {
  if (element.matches(`${FIXED_POSITION_SELECTOR}, .sr-only`)) return [];

  if (
    element.getBoundingClientRect().height <= liftLimit &&
    !element.querySelector(FIXED_POSITION_SELECTOR)
  ) {
    return [element];
  }

  if (depth === LIFT_SEARCH_DEPTH) return [];

  return [...element.children].flatMap((child) =>
    findLiftTargets(child, liftLimit, depth + 1),
  );
};
