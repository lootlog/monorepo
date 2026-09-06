import { buildLootItemOwnerMap } from "@/features/guild/loots-list/utils/build-loot-share-maps";
import type { Loot, Item } from "@/lib/loots/loot-types";
export type LootPresentationData = Pick<
  Loot,
  | "players"
  | "items"
  | "npcs"
  | "lootShare"
  | "world"
  | "location"
  | "createdAt"
>;
export type ItemsByPlayer = Record<string, Item[]>;

export const buildLootData = (loot: LootPresentationData) => {
  const itemOwnerMap = buildLootItemOwnerMap(loot.lootShare);

  const itemsByPlayer = loot.players.reduce<ItemsByPlayer>((acc, player) => {
    acc[player.id] = [];
    return acc;
  }, {});

  const unassignedItems: Item[] = [];
  const singlePlayerId =
    loot.players.length === 1 ? loot.players[0]?.id : undefined;

  loot.items.forEach((item) => {
    const ownerId = itemOwnerMap[item.hid];
    if (ownerId && itemsByPlayer[ownerId]) {
      itemsByPlayer[ownerId].push(item);
    } else if (singlePlayerId && itemsByPlayer[singlePlayerId]) {
      itemsByPlayer[singlePlayerId].push(item);
    } else {
      unassignedItems.push(item);
    }
  });

  const sortedPlayers = [...loot.players].sort((a, b) => {
    const aItems = itemsByPlayer[a.id]?.length || 0;
    const bItems = itemsByPlayer[b.id]?.length || 0;
    if (aItems > 0 && bItems === 0) return -1;
    if (aItems === 0 && bItems > 0) return 1;
    return 0;
  });

  return {
    itemsByPlayer,
    unassignedItems,
    sortedPlayers,
  };
};
