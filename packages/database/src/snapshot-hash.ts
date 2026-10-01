import { createHash } from "node:crypto";
import type { GameVersion } from "@lootlog/schema/game-version";
import { splitItemStat } from "./item-stat.js";

export function createPlayerSnapshotHash(
  name: string,
  profession: string | null | undefined,
  icon: string,
): string {
  return createHash("sha256")
    .update(`${name}${profession}${icon}`)
    .digest("hex");
}

/** Hash of the revision stats: per-instance entries are ignored, order is not. */
export function createItemStatsHash(stats: string): string {
  const normalized = splitItemStat(stats).revision.split(";").sort().join(";");

  return createHash("sha256").update(normalized).digest("hex");
}

/**
 * An item revision is one observed presentation of a template: its edition,
 * name, icon, type and revision stats. Localized names, renames and icon
 * changes are separate revisions; per-instance stats never create one.
 */
export function createItemSnapshotHash(item: {
  gameVersion: GameVersion;
  itemId: number;
  name: string;
  icon: string;
  itemType?: string | null;
  stat: string;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        "item-observation-v1",
        item.gameVersion,
        item.itemId,
        item.name,
        item.icon,
        item.itemType ?? null,
        createItemStatsHash(item.stat),
      ]),
    )
    .digest("hex");
}

/**
 * A revision describes one observation, never the latest attributes of an NPC.
 * Every world of an edition uses the same NPC ids, so the edition, not the
 * world, separates revisions: one observation on several worlds of an edition
 * is one revision, and editions never share one.
 */
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
  return createHash("sha256")
    .update(
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
    )
    .digest("hex");
}
