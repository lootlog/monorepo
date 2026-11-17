import { ItemTile as SharedItemTile } from "@lootlog/ui/components/item-tile";
import { DisplayItemRarity } from "@lootlog/domain/item-rarity";
import type { Item } from "@/lib/loots/loot-types";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

export type ItemTileProps = {
  color?: string;
  item: Pick<Item, "name" | "icon" | "stat" | "type"> & {
    rarity?: DisplayItemRarity | null;
  };
  shareIndex?: number;
  shareNickname?: string;
};

export const ItemTile: FC<ItemTileProps> = ({
  color = "",
  item,
  shareIndex,
  shareNickname,
}) => {
  const { t } = useTranslation();

  const typeLabels = item.type
    ? { [item.type]: t(`itemType.${item.type}`) }
    : {};

  const labels = {
    obtainedBy: t("loots.list.obtainedBy"),
    rarity: {
      [DisplayItemRarity.COMMON]: t("itemRarity.COMMON"),
      [DisplayItemRarity.HEROIC]: t("itemRarity.HEROIC"),
      [DisplayItemRarity.LEGENDARY]: t("itemRarity.LEGENDARY"),
      [DisplayItemRarity.UNIQUE]: t("itemRarity.UNIQUE"),
      [DisplayItemRarity.UPGRADED]: t("itemRarity.UPGRADED"),
    },
    type: typeLabels,
    upgradeLevel: t("loots.list.upgradeLevel"),
  };

  return (
    <SharedItemTile
      color={color}
      item={{
        ...item,
        rarity: item.rarity ?? DisplayItemRarity.COMMON,
      }}
      labels={labels}
      shareIndex={shareIndex}
      shareNickname={shareNickname}
    />
  );
};
