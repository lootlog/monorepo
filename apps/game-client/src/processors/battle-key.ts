import { storageKey } from "@/lib/storage-key";

const STORAGE_KEY = storageKey("ll:battle:key");

type StoredBattleKey = {
  key: string;
  signature: string;
  ended: boolean;
};

let unstoredBattleKey: StoredBattleKey | null = null;

const isStoredBattleKey = (value: unknown): value is StoredBattleKey =>
  typeof value === "object" &&
  value !== null &&
  "key" in value &&
  typeof value.key === "string" &&
  "signature" in value &&
  typeof value.signature === "string" &&
  "ended" in value &&
  typeof value.ended === "boolean";

const readBattleKey = (): StoredBattleKey | null => {
  try {
    const parsed: unknown = JSON.parse(
      sessionStorage.getItem(STORAGE_KEY) ?? "null",
    );

    return isStoredBattleKey(parsed) ? parsed : null;
  } catch {
    return unstoredBattleKey;
  }
};

const writeBattleKey = (battleKey: StoredBattleKey) => {
  unstoredBattleKey = battleKey;

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(battleKey));
  } catch {
    // Without storage the key still lasts until a reload.
  }
};

/**
 * Names a battle for the weapon kill counters. A page reload makes Margonem
 * send the battle again from its first row, so an `init` with the signature
 * of the battle the tab was in keeps its key: while that battle runs, and when
 * Margonem repeats it after it ended. A new battle that merely looks the same
 * starts after the old one ended, without an end of its own, and gets a new
 * key.
 */
export const resolveBattleKey = (
  signature: string,
  initEndsBattle: boolean,
): string => {
  const stored = readBattleKey();

  if (stored?.signature === signature && (!stored.ended || initEndsBattle)) {
    return stored.key;
  }

  const key = crypto.randomUUID();
  writeBattleKey({ key, signature, ended: initEndsBattle });

  return key;
};

export const markBattleKeyEnded = (key: string): void => {
  const stored = readBattleKey();

  if (stored?.key === key && !stored.ended) {
    writeBattleKey({ ...stored, ended: true });
  }
};
