import type { RenderReport } from "@/scripts/render-metrics";

type ComponentName = {
  displayName?: string;
  name?: string;
};

type FiberType = ComponentName & {
  type?: ComponentName;
  render?: ComponentName;
};

type Fiber = {
  readonly tag: number;
  readonly type: FiberType | null;
  readonly flags: number;
  readonly alternate: Fiber | null;
  readonly child: Fiber | null;
  readonly sibling: Fiber | null;
};

type FiberRoot = { readonly current: Fiber };

const FUNCTION_COMPONENT = 0;

const CLASS_COMPONENT = 1;

const FORWARD_REF = 11;

const SIMPLE_MEMO_COMPONENT = 15;

const COMPONENT_TAGS = new Set([
  FUNCTION_COMPONENT,
  CLASS_COMPONENT,
  FORWARD_REF,
  SIMPLE_MEMO_COMPONENT,
]);

const PERFORMED_WORK = 1;

const state = {
  counting: false,
  commits: 0,
  everCommitted: 0,
  counts: new Map<string, number>(),
};

const nameOf = ({ type }: Fiber) => {
  const inner = type?.type ?? type?.render ?? type;
  const raw = type?.displayName || inner?.displayName || inner?.name || "";

  return raw.replace(/^(Forget\(|Memo\()+|\)+$/g, "") || "Anonymous";
};

const countRenderedComponents = (fiber: Fiber | null): number => {
  let rendered = 0;

  for (let node = fiber; node; node = node.sibling) {
    const performed =
      COMPONENT_TAGS.has(node.tag) &&
      (node.flags & PERFORMED_WORK) === PERFORMED_WORK;

    if (performed) {
      const name = nameOf(node);

      state.counts.set(name, (state.counts.get(name) ?? 0) + 1);
      rendered += 1;
    }

    const bailedOut =
      node.alternate !== null &&
      node.child === node.alternate.child &&
      !performed;

    if (node.child && !bailedOut)
      rendered += countRenderedComponents(node.child);
  }

  return rendered;
};

Object.assign(globalThis, {
  __REACT_DEVTOOLS_GLOBAL_HOOK__: {
    supportsFiber: true,
    renderers: new Map(),
    inject: () => 1,
    checkDCE: () => {},
    onCommitFiberUnmount: () => {},
    onPostCommitFiberRoot: () => {},
    onCommitFiberRoot: (_rendererId: number, root: FiberRoot) => {
      state.everCommitted += 1;

      if (state.counting && countRenderedComponents(root.current.child) > 0)
        state.commits += 1;
    },
  },
});

export const commitsSoFar = () => state.everCommitted;

export const startCounting = () => {
  state.commits = 0;
  state.counts = new Map();
  state.counting = true;
};

export const stopCounting = (): RenderReport => {
  state.counting = false;

  const sorted = [...state.counts].toSorted(
    ([a, x], [b, y]) => y - x || a.localeCompare(b),
  );

  return {
    commits: state.commits,
    renders: sorted.reduce((total, [, count]) => total + count, 0),
    components: Object.fromEntries(sorted),
  };
};
