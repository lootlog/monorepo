import { createHash } from "node:crypto";

export function createPlayerSnapshotHash(
  name: string,
  profession: string | null | undefined,
  icon: string,
): string {
  return createHash("sha256")
    .update(`${name}${profession}${icon}`)
    .digest("hex");
}

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

/** A revision describes one observation, never the latest attributes of an NPC. */
export function createNpcSnapshotHash(npc: {
  identityNamespace: string;
  world: string;
  npcId: number;
  name: string;
  type?: string | null;
  lvl?: number | null;
  icon?: string | null;
  prof?: string | null;
  wt?: number | null;
  margonemType?: number | null;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        "npc-observation-v1",
        npc.identityNamespace,
        npc.world,
        npc.npcId,
        npc.name,
        npc.type ?? null,
        npc.lvl ?? null,
        npc.icon ?? null,
        npc.prof ?? null,
        npc.wt ?? null,
        npc.margonemType ?? null,
      ]),
    )
    .digest("hex");
}
