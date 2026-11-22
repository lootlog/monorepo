import type { PersistStorage, StorageValue } from "zustand/middleware";
import { shallow } from "zustand/vanilla/shallow";

export function createChangedOnlyStorage<State>(
  storage: PersistStorage<State> | undefined,
): PersistStorage<State> | undefined {
  if (!storage) return storage;

  let lastWritten: StorageValue<State> | null = null;

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
