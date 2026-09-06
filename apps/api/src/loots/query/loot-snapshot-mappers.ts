import { ProfessionEnum as Profession } from "@lootlog/schema/loot";
import type { LootItemDto } from "#src/loots/query/loot-item";
import type { LootNpcDto } from "#src/loots/query/loot-npc";
import { getProfByShortname } from "#src/shared/margonem/profession";
import type {
  itemSnapshotTable,
  playerSnapshotTable,
  npcSnapshotTable,
} from "#src/database/drizzle/schema";
type LootItemWithSnapshot = {
  hid: string;
  itemSnapshot: typeof itemSnapshotTable.$inferSelect;
};
type LootPlayerWithSnapshot = {
  lvl: number | null;
  hpp: number | null;
  playerSnapshot: typeof playerSnapshotTable.$inferSelect;
};
type LootNpcWithSnapshot = {
  npcSnapshot: typeof npcSnapshotTable.$inferSelect;
};

const parseNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseStatValue = (statRaw: string, key: string): string | null => {
  const prefix = `${key}=`;
  const segment = statRaw.split(";").find((entry) => entry.startsWith(prefix));
  return segment?.slice(prefix.length) ?? null;
};

const parseRequiredProf = (required?: string | null): Profession[] =>
  required
    ? required
        .split("")
        .map((short) => getProfByShortname(short))
        .filter(Boolean)
    : Object.values(Profession);

export const mapItem = (lootItem: LootItemWithSnapshot): LootItemDto => {
  const statRaw = lootItem.itemSnapshot.statRaw;
  const lvl =
    lootItem.itemSnapshot.lvl ??
    parseNumber(parseStatValue(statRaw, "lvl")) ??
    0;
  return {
    id: lootItem.itemSnapshot.itemId,
    hid: lootItem.hid,
    name: lootItem.itemSnapshot.name,
    icon: lootItem.itemSnapshot.icon,
    stat: statRaw,
    type: lootItem.itemSnapshot.itemType,
    rarity: lootItem.itemSnapshot.rarity,
    lvl,
    prof: parseRequiredProf(parseStatValue(statRaw, "reqp")),
  };
};

export const mapPlayer = (lootPlayer: LootPlayerWithSnapshot) => {
  const snapshot = lootPlayer.playerSnapshot;
  const accountId = parseNumber(snapshot.accountId);
  const characterId = parseNumber(snapshot.characterId);
  return {
    id: `${characterId ?? snapshot.characterId}${accountId ?? snapshot.accountId}`,
    name: snapshot.name,
    lvl: lootPlayer.lvl ?? null,
    prof: snapshot.prof,
    icon: snapshot.icon,
    characterId,
    accountId,
    hpp: lootPlayer.hpp,
  };
};

export const mapNpc = (lootNpc: LootNpcWithSnapshot): LootNpcDto => ({
  id: lootNpc.npcSnapshot.npcId,
  name: lootNpc.npcSnapshot.name,
  wt: lootNpc.npcSnapshot.wt ?? null,
  lvl: lootNpc.npcSnapshot.lvl ?? null,
  prof: lootNpc.npcSnapshot.prof ?? null,
  icon: lootNpc.npcSnapshot.icon,
  type: lootNpc.npcSnapshot.type,
  margonemType: lootNpc.npcSnapshot.margonemType ?? null,
});
