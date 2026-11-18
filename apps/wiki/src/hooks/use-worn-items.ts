import {
  type CatalogItemDtoOutput,
  useCatalogControllerGetItems,
} from "@lootlog/client/catalog";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { itemForCharacter } from "@lootlog/domain/elastic-level";
import type { EquipmentSet } from "@/lib/equipment-set";
import {
  EQUIPMENT_SLOTS,
  type EquipmentSlotId,
  handsFit,
} from "@/lib/equipment-slots";
import {
  findRequirementIssues,
  type ItemRequirementIssue,
} from "@/lib/item-stat-totals";
import {
  type ItemUpgrade,
  NO_UPGRADE,
  upgradeItemStat,
} from "@lootlog/domain/item-upgrade";

export type WornItemIssue = ItemRequirementIssue | "hands";

export type WornItem = {
  /** The item at the set's level, with the stats its upgrade gives it. */
  item: CatalogItemDtoOutput;
  upgrade: ItemUpgrade;
  /** What keeps the set's character from wearing the item as the set has it. */
  issues: readonly WornItemIssue[];
};

/** A set's items by id; every reader shares one catalog request. */
export const useSetCatalogItems = (set: EquipmentSet) => {
  const ids = Object.values(set.items);

  const { data, isPlaceholderData } = useCatalogControllerGetItems(
    { ids, gameVersion: WIKI_GAME_VERSION, limit: ids.length },
    {
      query: {
        enabled: ids.length > 0,
        placeholderData: (previous) => previous,
      },
    },
  );

  return {
    itemsById: new Map((data?.hits ?? []).map((item) => [item.id, item])),
    // While a changed set loads, the previous response stands in and lacks
    // the new items, so the set is not yet as worn.
    isLoaded: ids.length === 0 || (data !== undefined && !isPlaceholderData),
  };
};

/** The set from the page's context with its items. */
const useSetItems = () => {
  const { set } = useEquipmentSet();

  return { set, ...useSetCatalogItems(set) };
};

const wornIn = (
  { set, itemsById }: ReturnType<typeof useSetItems>,
  slotId: EquipmentSlotId,
): WornItem | undefined => {
  const itemId: EquipmentSet["items"][EquipmentSlotId] = set.items[slotId];
  const item = itemId === undefined ? undefined : itemsById.get(itemId);
  const upgrade = set.upgrades[slotId] ?? NO_UPGRADE;

  if (!item) return undefined;

  const looted = itemForCharacter(item, set.level);
  const stat = upgradeItemStat(looted, upgrade);

  // A shared link can carry a pair no character holds at once.
  const weaponId = slotId === "secondary" ? set.items.weapon : undefined;
  const weapon = weaponId === undefined ? undefined : itemsById.get(weaponId);

  return {
    item: { ...looted, stat },
    upgrade,
    issues: [
      ...findRequirementIssues(stat, set),
      ...(weapon && !handsFit(weapon.type, item.type)
        ? (["hands"] as const)
        : []),
    ],
  };
};

const wornItemsOf = (setItems: ReturnType<typeof useSetItems>) =>
  new Map(
    EQUIPMENT_SLOTS.flatMap(({ id }) => {
      const worn = wornIn(setItems, id);

      return worn ? [[id, worn] as const] : [];
    }),
  );

/** The set's items as they are worn, upgrades included, by slot. */
export const useWornItems = (): Map<EquipmentSlotId, WornItem> =>
  wornItemsOf(useSetItems());

/** The worn items and whether they have loaded at all. */
export const useLoadedWornItems = () => {
  const setItems = useSetItems();

  return { wornItems: wornItemsOf(setItems), isLoaded: setItems.isLoaded };
};

/** The item worn in one slot, if it has loaded. */
export const useWornItem = (slotId: EquipmentSlotId | undefined) => {
  const setItems = useSetItems();

  return slotId === undefined ? undefined : wornIn(setItems, slotId);
};
