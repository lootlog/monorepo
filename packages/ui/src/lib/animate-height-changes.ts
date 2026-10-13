import { getPrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";

const HEIGHT_ANIMATION: KeyframeAnimationOptions = {
  duration: 200,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
};

// Bounds the layout reads made after each commit inside long lists.
const MAX_MEASURED_ELEMENTS = 500;

type Box = { height: number; children: HTMLElement[] };

type Layout = Map<HTMLElement, Box>;

// An element that changed height, or the space left by removed elements.
type Target =
  | { element: HTMLElement; from: number }
  | { parent: HTMLElement; runs: Run[]; from: number };

// Consecutive removed elements and the element that now follows them.
type Run = { before: HTMLElement | null; height: number };

type Running = { animation: Animation; restore: () => void };

const spacers = new WeakSet<HTMLElement>();

const readHeight = (element: HTMLElement) =>
  Number.parseFloat(getComputedStyle(element).height);

// A capped scroll container shows only part of its content, so its own box
// carries the visible change.
const clipsContent = (element: HTMLElement) =>
  getComputedStyle(element).overflowY !== "visible" &&
  element.scrollHeight - element.clientHeight > 1;

// Out-of-flow elements, such as scrollbars, do not move the content.
const isOutOfFlow = (element: HTMLElement) => {
  const { position } = getComputedStyle(element);

  return position === "absolute" || position === "fixed";
};

const hasOwnBox = (element: HTMLElement) => {
  const { display } = getComputedStyle(element);

  return display !== "inline" && display !== "contents";
};

// Whether a removed child's space can be held by one full-width placeholder.
const stacksChildren = (element: HTMLElement) => {
  const { display, flexDirection, gridTemplateColumns } =
    getComputedStyle(element);

  if (display.endsWith("flex")) return flexDirection === "column";

  if (display.endsWith("grid")) return !gridTemplateColumns.includes(" ");

  return display === "block" || display === "flow-root";
};

function measure(root: HTMLElement): Layout {
  const layout: Layout = new Map();
  const queue = [root];

  for (const element of queue) {
    if (layout.size >= MAX_MEASURED_ELEMENTS) break;

    const children = [...element.children].filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && !spacers.has(child),
    );

    layout.set(element, { height: element.offsetHeight, children });

    queue.push(...children);
  }

  return layout;
}

function findRemovedRuns(
  element: HTMLElement,
  previous: Layout,
  removed: Set<HTMLElement>,
): Run[] {
  const runs: Run[] = [];
  let height = 0;

  for (const child of previous.get(element)?.children ?? []) {
    if (removed.has(child)) {
      height += previous.get(child)?.height ?? 0;
    } else if (height > 0) {
      runs.push({ before: child, height });
      height = 0;
    }
  }

  if (height > 0) runs.push({ before: null, height });

  return runs;
}

/**
 * Finds the deepest elements whose own content changed height, so the
 * animation runs where the change happened and the content after it follows
 * in flow instead of jumping inside a resizing container.
 */
function findChangedElements(
  element: HTMLElement,
  previous: Layout,
  next: Layout,
): Target[] {
  const own = [{ element, from: previous.get(element)?.height ?? 0 }];
  const before = new Set(previous.get(element)?.children);
  const children = next.get(element)?.children ?? [];
  const current = new Set(children);

  const added = children.filter(
    (child) => !before.has(child) && !isOutOfFlow(child),
  );

  const removed = new Set([...before].filter((child) => !current.has(child)));

  if (added.length > 0) {
    if ((removed.size > 0 && added.length > 1) || !added.every(hasOwnBox)) {
      return own;
    }

    // New content grows from nothing, or from the content it replaced.
    const from = [...removed].reduce(
      (sum, child) => sum + (previous.get(child)?.height ?? 0),
      0,
    );

    return added.map((child) => ({ element: child, from }));
  }

  if (removed.size > 0) {
    return stacksChildren(element)
      ? [
          {
            parent: element,
            runs: findRemovedRuns(element, previous, removed),
            from: previous.get(element)?.height ?? 0,
          },
        ]
      : own;
  }

  const changed = children.filter((child) => {
    const was = previous.get(child)?.height;
    const is = next.get(child)?.height;

    return was !== undefined && is !== undefined && Math.abs(is - was) >= 1;
  });

  if (changed.length === 0) return own;

  return changed.flatMap((child) => {
    if (isOutOfFlow(child)) return [];

    if (!hasOwnBox(child)) return own;

    return clipsContent(child)
      ? [{ element: child, from: previous.get(child)?.height ?? 0 }]
      : findChangedElements(child, previous, next);
  });
}

const uniqueTargets = (targets: Target[]) => [
  ...new Map(
    targets.map((target) => [
      "element" in target ? target.element : target.parent,
      target,
    ]),
  ).values(),
];

/**
 * Ref callback that animates the height of an auto-height overlay when its
 * content changes. Mutations are handled before paint, so the new height never
 * flashes; other resizes, such as a viewport change, are not animated.
 */
export function animateHeightChanges(root: HTMLElement | null) {
  // jsdom implements neither API.
  if (!root || !("animate" in root) || !("ResizeObserver" in window)) return;

  let layout = measure(root);
  const running = new Map<HTMLElement, Running>();

  const stopAll = () => {
    for (const { animation, restore } of running.values()) {
      animation.cancel();
      restore();
    }
  };

  const animate = (element: HTMLElement, from: number, to: number) => {
    if (Math.abs(to - from) < 1) return;

    const { overflow, alignContent } = element.style;

    // Clip the content and keep grid tracks at their own size while the
    // element is shorter or taller than its content.
    element.style.overflow = "hidden";
    element.style.alignContent = "start";

    const keyframes: PropertyIndexedKeyframes = {
      height: [`${Math.max(from, 0)}px`, `${to}px`],
    };

    // A start below zero also takes back the gap that new content brings.
    if (from < 0) {
      const margin = Number.parseFloat(getComputedStyle(element).marginBottom);

      keyframes.marginBottom = [`${margin + from}px`, `${margin}px`];
    }

    const animation = element.animate(keyframes, HEIGHT_ANIMATION);

    const restore = () => {
      running.delete(element);
      element.style.overflow = overflow;
      element.style.alignContent = alignContent;
    };

    animation.onfinish = restore;
    running.set(element, { animation, restore });
  };

  // Holds the space of removed elements and closes it, so the content after
  // them slides up instead of jumping.
  const collapse = (parent: HTMLElement, runs: Run[], from: number) => {
    const created = runs.map((run) => {
      const spacer = document.createElement("div");

      spacer.setAttribute("aria-hidden", "true");
      spacer.style.flex = "none";
      spacer.style.height = "0";
      spacers.add(spacer);
      parent.insertBefore(spacer, run.before);

      return { spacer, run };
    });

    // Empty spacers can still add a gap or a sibling margin; their final
    // margin takes it back so the end state matches the content without them.
    const withSpacers = parent.offsetHeight;
    const extra = withSpacers - (layout.get(parent)?.height ?? withSpacers);
    const space = Math.max(from - withSpacers, 0);
    const total = runs.reduce((sum, run) => sum + run.height, 0);

    for (const { spacer, run } of created) {
      const share = run.height / total;
      const margin = Number.parseFloat(getComputedStyle(spacer).marginBottom);
      const end = `${margin - extra / created.length}px`;

      spacer.style.marginBottom = end;

      const animation = spacer.animate(
        {
          height: [`${space * share}px`, "0px"],
          marginBottom: [`${margin}px`, end],
        },
        HEIGHT_ANIMATION,
      );

      const restore = () => {
        running.delete(spacer);
        spacer.remove();
      };

      animation.onfinish = restore;
      running.set(spacer, { animation, restore });
    }
  };

  const applyTargets = (
    targets: Target[],
    visible: Map<HTMLElement, number>,
    visibleChange: number,
  ) => {
    const single = targets.length === 1;

    for (const target of targets) {
      if ("element" in target) {
        const to = readHeight(target.element);

        animate(
          target.element,
          single
            ? to + visibleChange
            : (visible.get(target.element) ?? target.from),
          to,
        );
      } else {
        collapse(
          target.parent,
          target.runs,
          single
            ? (layout.get(target.parent)?.height ?? 0) + visibleChange
            : target.from,
        );
      }
    }
  };

  const attachEffects = (attached: boolean) => {
    for (const [element, { animation }] of running) {
      if (animation.effect instanceof KeyframeEffect) {
        animation.effect.target = attached ? element : null;
      }
    }
  };

  const resizeObserver = new ResizeObserver(() => {
    if (running.size === 0) layout = measure(root);
  });

  const mutationObserver = new MutationObserver(() => {
    if (
      getPrefersReducedMotion() ||
      root.closest("[data-ending-style]") !== null
    ) {
      return;
    }

    const previous = layout;

    const rootBefore =
      running.size > 0 ? readHeight(root) : (previous.get(root)?.height ?? 0);

    const visible = new Map(
      [...running.keys()].map((element) => [element, readHeight(element)]),
    );

    // Detach running animations to measure the content beneath them.
    attachEffects(false);
    layout = measure(root);
    attachEffects(true);

    // The content kept its height, so any running animation still fits.
    if (
      Math.abs(
        (previous.get(root)?.height ?? 0) - (layout.get(root)?.height ?? 0),
      ) < 1
    ) {
      return;
    }

    stopAll();

    const found = clipsContent(root)
      ? [{ element: root, from: previous.get(root)?.height ?? 0 }]
      : findChangedElements(root, previous, layout);

    // A single target absorbs the whole visible change, which also covers an
    // animation interrupted elsewhere.
    const visibleChange = rootBefore - readHeight(root);
    applyTargets(uniqueTargets(found), visible, visibleChange);

    // Drop the records produced by the DOM writes above.
    mutationObserver.takeRecords();
  });

  resizeObserver.observe(root);
  mutationObserver.observe(root, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });

  return () => {
    resizeObserver.disconnect();
    mutationObserver.disconnect();
    stopAll();
  };
}
