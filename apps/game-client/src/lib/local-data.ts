import { storageKey } from "@/lib/storage-key";

/** `ll` stores go through `storageKey`; the character list cache is written raw. */
const LOOTLOG_STORAGE_PREFIXES = [
  storageKey("ll:"),
  storageKey("ll-"),
  "lootlog:",
];

/** Keys the game client owns in the given storage; Margonem's own keys are left alone. */
export const listLootlogStorageKeys = (
  storage: Pick<Storage, "length" | "key">,
) => {
  const keys: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);

    if (
      key &&
      LOOTLOG_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
    ) {
      keys.push(key);
    }
  }

  return keys;
};

/**
 * Removes every locally persisted Lootlog store (windows, timers, logs, device
 * preferences). Server-synced settings are untouched. The caller reloads the
 * page so no in-memory store writes its state back.
 */
export const clearLootlogLocalData = (storage: Storage = localStorage) => {
  for (const key of listLootlogStorageKeys(storage)) {
    storage.removeItem(key);
  }
};
