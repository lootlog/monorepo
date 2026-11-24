import { Link } from "@tanstack/react-router";
import type { CatalogItemDtoOutput } from "@lootlog/client/catalog";
import { ItemTile } from "@lootlog/ui/components/item-tile";
import { resolveItemRarity } from "@lootlog/domain/item-rarity";
import { useWornItem } from "@/hooks/use-worn-items";
import { t } from "@/i18n/messages";
import { itemPageParams, itemPageSearch } from "@/lib/catalog-links";
import { findEquipmentSlot } from "@/lib/equipment-slots";
import { ITEM_TILE_LABELS } from "@/lib/item-options";
import {
  isSameUpgrade,
  type ItemUpgrade,
  NO_UPGRADE,
  upgradeItemStat,
} from "@lootlog/domain/item-upgrade";

type CatalogItemTileProps = {
  item: CatalogItemDtoOutput;
  upgrade?: ItemUpgrade;
};

export function CatalogItemTile({
  item,
  upgrade = NO_UPGRADE,
}: CatalogItemTileProps) {
  const worn = useWornItem(findEquipmentSlot(item.type)?.id);

  const isSameItem =
    worn?.item.id === item.id && isSameUpgrade(worn.upgrade, upgrade);

  return (
    <ItemTile
      item={{
        icon: item.icon,
        name: item.name,
        rarity: resolveItemRarity(item.rarity),
        stat: upgradeItemStat(item, upgrade),
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
              lostLabel: t("equipment.lostStats"),
            }
          : undefined
      }
      labels={ITEM_TILE_LABELS}
      render={
        <Link
          to="/items/$itemSlug"
          params={itemPageParams(item)}
          search={itemPageSearch(upgrade)}
          className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      }
    />
  );
}
