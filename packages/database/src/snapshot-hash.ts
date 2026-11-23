import type { GameVersion } from "@lootlog/schema/game-version";
import { splitItemStat } from "@lootlog/domain/item-stat";

function hashSnapshotPayload(payload: string): string {
  return new Bun.CryptoHasher("sha256").update(payload).digest("hex");
}

export function createPlayerSnapshotHash(
  name: string,
  profession: string | null | undefined,
  icon: string,
): string {
  return hashSnapshotPayload(`${name}${profession}${icon}`);
}

export function createItemStatsHash(stats: string): string {
  const normalized = splitItemStat(stats).revision.split(";").sort().join(";");

  return hashSnapshotPayload(normalized);
}

export function createItemSnapshotHash(item: {
  gameVersion: GameVersion;
  itemId: number;
  name: string;
  icon: string;
  itemType?: string | null;
  stat: string;
}): string {
  return hashSnapshotPayload(
    JSON.stringify([
      "item-observation-v1",
      item.gameVersion,
      item.itemId,
      item.name,
      item.icon,
      item.itemType ?? null,
      createItemStatsHash(item.stat),
    ]),
  );
}

export function createNpcSnapshotHash(npc: {
  identityNamespace: string;
  gameVersion: GameVersion;
  npcId: number;
  name: string;
  type?: string | null;
  lvl?: number | null;
  icon?: string | null;
  prof?: string | null;
  wt?: number | null;
  margonemType?: number | null;
}): string {
  return hashSnapshotPayload(
    JSON.stringify([
      "npc-observation-v2",
      npc.identityNamespace,
      npc.gameVersion,
      npc.npcId,
      npc.name,
      npc.type ?? null,
      npc.lvl ?? null,
      npc.icon ?? null,
      npc.prof ?? null,
      npc.wt ?? null,
      npc.margonemType ?? null,
    ]),
  );
}
