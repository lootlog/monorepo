import type { PersistStorage, StorageValue } from "zustand/middleware";
import { shallow } from "zustand/vanilla/shallow";

/**
 * persist rewrites storage after every set, even when the state did not change
 * or only transient fields outside partialize did. Skips writes whose persisted
 * fields are all unchanged, so a store updated from game packets or keystrokes
 * does not serialize and write synchronously each time. The payload format is
 * unchanged, so existing stored values load as before.
 */
export function createChangedOnlyStorage<State>(
  storage: PersistStorage<State> | undefined,
): PersistStorage<State> | undefined {
  if (!storage) return storage;

  let lastWritten: StorageValue<State> | null = null;

  // Hydration keeps the stored values, so the first set that changes only
  // transient fields must not write them back over another tab's update.
  const remember = (value: StorageValue<State> | null) => {
    lastWritten = value;

    return value;
  };

  return {
    getItem: (name) => {
      const stored = storage.getItem(name);

      return stored instanceof Promise
        ? stored.then(remember)
        : remember(stored);
    },
    setItem: (name, value) => {
      if (
        lastWritten !== null &&
        lastWritten.version === value.version &&
        shallow(lastWritten.state, value.state)
      ) {
        return;
      }

      const result = storage.setItem(name, value);
      lastWritten = value;

      return result;
    },
    removeItem: (name) => {
      lastWritten = null;

      return storage.removeItem(name);
    },
  };
}
