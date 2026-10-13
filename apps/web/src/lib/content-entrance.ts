import { getPrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";

/** The keyframe every loading placeholder reveals itself with after its delay. */
const PLACEHOLDER_REVEAL_ANIMATION = "placeholder-in";

const FADE_DURATION_MS = 240;

const STAGGER_STEP_MS = 30;

const STAGGERED_SIBLINGS = 3;

/**
 * Content that replaces a loading placeholder the player actually saw fades in
 * where it lands; nothing moves, so the handoff never shifts the layout.
 * Content that arrives before any placeholder showed, such as a cached or fast
 * navigation, appears at once and never fades.
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

/** Siblings entering together are staggered, but only the first few. */
const playEntrances = (siblingGroups: HTMLElement[][]) => {
  const easing = getComputedStyle(document.documentElement).getPropertyValue(
    "--ease-emphasized",
  );

  for (const siblings of siblingGroups) {
    siblings.forEach((element, index) => {
      element.animate([{ offset: 0, opacity: 0 }], {
        delay: getStaggerDelay(index),
        duration: FADE_DURATION_MS,
        easing,
        fill: "backwards",
      });
    });
  }
};

const getStaggerDelay = (index: number) =>
  Math.min(index, STAGGERED_SIBLINGS - 1) * STAGGER_STEP_MS;
