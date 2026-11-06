import { findLootItemOwner } from "@lootlog/domain/loot-draw";
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
  const itemsByPlayer = loot.players.reduce<ItemsByPlayer>((acc, player) => {
    acc[player.id] = [];

    return acc;
  }, {});

  const unassignedItems: Item[] = [];

  loot.items.forEach((item) => {
    const owner = findLootItemOwner(loot, item.hid);
    const ownerItems = owner ? itemsByPlayer[owner.id] : undefined;

    if (ownerItems) ownerItems.push(item);
    else unassignedItems.push(item);
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
