import type { Loot } from "@/lib/loots/loot-types";

export type LootItemOwnerMap = Record<string, string | undefined>;

export const buildLootItemOwnerMap = (
  lootShare: Loot["lootShare"] | null | undefined,
) => {
  const itemOwnerMap: LootItemOwnerMap = {};

  Object.entries(lootShare ?? {}).forEach(([playerId, itemIds]) => {
    itemIds.forEach((itemId) => {
      itemOwnerMap[itemId] = playerId;
    });
  });

  return itemOwnerMap;
};
