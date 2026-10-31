import {
  type CatalogItemDtoOutput,
  useCatalogControllerGetItems,
} from "@lootlog/client/search";
import { useEquipmentSet } from "@/contexts/equipment-set-context";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import type { EquipmentSet } from "@/lib/equipment-set";
import { EQUIPMENT_SLOTS, type EquipmentSlotId } from "@/lib/equipment-slots";
import {
  type ItemUpgrade,
  NO_UPGRADE,
  upgradeItemStat,
} from "@/lib/item-upgrade";

export type WornItem = {
  /** The item with the stats its upgrade gives it. */
  item: CatalogItemDtoOutput;
  upgrade: ItemUpgrade;
};

/** The set and its items by id; every reader shares one catalog request. */
const useSetItems = () => {
  const { set } = useEquipmentSet();
  const ids = Object.values(set.items);

  const { data } = useCatalogControllerGetItems(
    { ids, gameVersion: WIKI_GAME_VERSION, limit: ids.length },
    {
      query: {
        enabled: ids.length > 0,
        placeholderData: (previous) => previous,
      },
    },
  );

  return {
    set,
    itemsById: new Map((data?.hits ?? []).map((item) => [item.id, item])),
  };
};

const wornIn = (
  { set, itemsById }: ReturnType<typeof useSetItems>,
  slotId: EquipmentSlotId,
): WornItem | undefined => {
  const itemId: EquipmentSet["items"][EquipmentSlotId] = set.items[slotId];
  const item = itemId === undefined ? undefined : itemsById.get(itemId);
  const upgrade = set.upgrades[slotId] ?? NO_UPGRADE;

  return item
    ? { item: { ...item, stat: upgradeItemStat(item, upgrade) }, upgrade }
    : undefined;
};

/** The set's items as they are worn, upgrades included, by slot. */
export const useWornItems = (): Map<EquipmentSlotId, WornItem> => {
  const setItems = useSetItems();

  return new Map(
    EQUIPMENT_SLOTS.flatMap(({ id }) => {
      const worn = wornIn(setItems, id);

      return worn ? [[id, worn] as const] : [];
    }),
  );
};

/** The item worn in one slot, if it has loaded. */
export const useWornItem = (slotId: EquipmentSlotId | undefined) => {
  const setItems = useSetItems();

  return slotId === undefined ? undefined : wornIn(setItems, slotId);
};
