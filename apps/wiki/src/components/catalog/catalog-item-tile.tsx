import type { CatalogItemDtoOutput } from "@lootlog/client/search";
import { ItemTile } from "@lootlog/ui/components/item-tile";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import { renderItemStat } from "@/components/render-item-stat";
import { useWornItem } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import { findEquipmentSlot } from "@/lib/equipment-slots";
import { ITEM_TILE_LABELS } from "@/lib/item-options";

/**
 * A catalog item's tile. Its tooltip sets the item beside the one the set
 * wears in its slot, unless that is this very item as dropped.
 */
export function CatalogItemTile({ item }: { item: CatalogItemDtoOutput }) {
  const worn = useWornItem(findEquipmentSlot(item.type)?.id);

  const isSameItem = worn?.item.id === item.id && worn.upgrade.level === 0;

  return (
    <ItemTile
      item={{
        icon: item.icon,
        name: item.name,
        rarity: resolveItemRarity(item.rarity),
        stat: item.stat,
        type: item.type,
      }}
      comparison={
        worn && !isSameItem
          ? {
              item: {
                icon: worn.item.icon,
                name: worn.item.name,
                rarity: resolveItemRarity(worn.item.rarity),
                stat: worn.item.stat,
                type: worn.item.type,
              },
              label: t("equipment.comparedWith"),
            }
          : undefined
      }
      labels={ITEM_TILE_LABELS}
      renderStat={renderItemStat}
    />
  );
}
