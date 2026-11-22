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
import { keepFittingSymbol, useSocketCatalog } from "@/hooks/use-socket-items";

type WornItemIssue = ItemRequirementIssue | "hands";

export type WornItem = {
  item: CatalogItemDtoOutput;
  dropped: CatalogItemDtoOutput;
  upgrade: ItemUpgrade;
  issues: readonly WornItemIssue[];
};

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
    isLoaded: ids.length === 0 || (data !== undefined && !isPlaceholderData),
  };
};

const useSetItems = () => {
  const { set } = useEquipmentSet();

  const hasSymbol = Object.values(set.upgrades).some(
    (upgrade) => upgrade?.symbol !== undefined,
  );

  const { items: symbols } = useSocketCatalog(hasSymbol);

  return { set, symbols, ...useSetCatalogItems(set) };
};

const wornIn = (
  { set, itemsById, symbols }: ReturnType<typeof useSetItems>,
  slotId: EquipmentSlotId,
): WornItem | undefined => {
  const itemId: EquipmentSet["items"][EquipmentSlotId] = set.items[slotId];
  const item = itemId === undefined ? undefined : itemsById.get(itemId);

  if (!item) return undefined;

  const looted = itemForCharacter(item, set.level);

  const upgrade = keepFittingSymbol(
    looted,
    set.upgrades[slotId] ?? NO_UPGRADE,
    symbols,
  );

  const stat = upgradeItemStat(looted, upgrade);

  const weaponId = slotId === "secondary" ? set.items.weapon : undefined;
  const weapon = weaponId === undefined ? undefined : itemsById.get(weaponId);

  return {
    item: { ...looted, stat },
    dropped: looted,
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

export const useWornItems = (): Map<EquipmentSlotId, WornItem> =>
  wornItemsOf(useSetItems());

export const useLoadedWornItems = () => {
  const setItems = useSetItems();

  return { wornItems: wornItemsOf(setItems), isLoaded: setItems.isLoaded };
};

export const useWornItem = (slotId: EquipmentSlotId | undefined) => {
  const setItems = useSetItems();

  return slotId === undefined ? undefined : wornIn(setItems, slotId);
};
