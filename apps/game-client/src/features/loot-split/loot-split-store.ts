import {
  EMPTY_LOOT_SPLIT_STATE,
  expireSplits,
  type LootSplitState,
} from "./loot-split-model";

type LootSplitSnapshot = Readonly<{
  state: LootSplitState;
  /** Clock of the last change, for the countdowns. */
  now: number;
}>;

/** Countdowns show whole seconds. */
const TICK_MS = 500;

const listeners = new Set<() => void>();

let snapshot: LootSplitSnapshot = {
  state: EMPTY_LOOT_SPLIT_STATE,
  now: Date.now(),
};

let tickInterval: ReturnType<typeof setInterval> | null = null;

const emit = () => {
  for (const listener of listeners) listener();
};

const setSnapshot = (state: LootSplitState, now: number) => {
  snapshot = { state, now };
  syncTicker();
  emit();
};

// Ticks only while a split is listed, so play without splits costs nothing.
function syncTicker() {
  const needed = snapshot.state.splits.length > 0;

  if (needed && tickInterval === null) {
    tickInterval = setInterval(() => {
      const now = Date.now();

      setSnapshot(expireSplits(snapshot.state, now), now);
    }, TICK_MS);
  } else if (!needed && tickInterval !== null) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
}

export const lootSplitStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => snapshot,
  /** Applies `update`; returns the states before and after it. */
  update(update: (state: LootSplitState) => LootSplitState) {
    const previous = snapshot.state;
    const next = update(previous);

    if (next !== previous) setSnapshot(next, Date.now());

    return { previous, next };
  },
};
