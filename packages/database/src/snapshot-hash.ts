import { createHash } from "node:crypto";

const SNAPSHOT_HASH_IGNORED_KEYS = new Set([
  "created",
  "gold",
  "amount",
  "opis",
]);

export function createItemStatsHash(stats: string): string {
  const normalized = stats
    .split(";")
    .filter((entry) => {
      const [key] = entry.split("=");
      return Boolean(key) && !SNAPSHOT_HASH_IGNORED_KEYS.has(key ?? "");
    })
    .sort()
    .join(";");
  return createHash("sha256").update(normalized).digest("hex");
}
