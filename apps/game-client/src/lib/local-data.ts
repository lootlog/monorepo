import { storageKey } from "@/lib/storage-key";

const LOOTLOG_STORAGE_PREFIXES = [
  storageKey("ll:"),
  storageKey("ll-"),
  "lootlog:",
];

const listLootlogStorageKeys = (storage: Pick<Storage, "length" | "key">) => {
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

export const clearLootlogLocalData = (storage: Storage = localStorage) => {
  for (const key of listLootlogStorageKeys(storage)) {
    storage.removeItem(key);
  }
};
