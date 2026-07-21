import { LOOT_SHARE_COLOR_PALETTE } from "@/features/guild/loots-list/constants/loot-share-color-palette";
import type { Loot } from "@/lib/loots/loot-types";

export type LootPlayerColorMap = Record<string, { color: string; idx: number }>;
export type LootItemOwnerMap = Record<string, string | undefined>;

export const buildLootPlayerColorMap = (
  players: Loot["players"],
): LootPlayerColorMap =>
  players.reduce<LootPlayerColorMap>((acc, player, idx) => {
    const color =
      LOOT_SHARE_COLOR_PALETTE[idx % LOOT_SHARE_COLOR_PALETTE.length] ?? "";
    acc[player.id] = { color, idx };
    return acc;
  }, {});

export const buildLootItemOwnerMap = (
  lootShare: Loot["lootShare"] | null | undefined,
): LootItemOwnerMap => {
  const itemOwnerMap: LootItemOwnerMap = {};

  Object.entries(lootShare ?? {}).forEach(([playerId, itemIds]) => {
    itemIds.forEach((itemId) => {
      itemOwnerMap[itemId] = playerId;
    });
  });

  return itemOwnerMap;
};

export const buildLootShareMaps = (
  loot: Pick<Loot, "players" | "lootShare">,
) => ({
  playerColorMap: buildLootPlayerColorMap(loot.players),
  itemOwnerMap: buildLootItemOwnerMap(loot.lootShare),
});
