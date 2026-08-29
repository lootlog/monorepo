import { ItemTile as SharedItemTile } from "@lootlog/ui/components/item-tile";
import type { ItemDisplayValue } from "@lootlog/ui/components/item-stat-utils";
import { ItemRarity, type Item } from "@/lib/loots/loot-types";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { TranslatedItemStat } from "./translated-item-stat";

export type ItemTileProps = {
  color?: string;
  item: Item;
  shareIndex?: number;
  shareNickname?: string;
};

const renderStat = (displayValue: ItemDisplayValue) => (
  <TranslatedItemStat displayValue={displayValue} />
);

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
      [ItemRarity.COMMON]: t("itemRarity.COMMON"),
      [ItemRarity.HEROIC]: t("itemRarity.HEROIC"),
      [ItemRarity.LEGENDARY]: t("itemRarity.LEGENDARY"),
      [ItemRarity.UNIQUE]: t("itemRarity.UNIQUE"),
      [ItemRarity.UPGRADED]: t("itemRarity.UPGRADED"),
    },
    type: typeLabels,
    typePrefix: t("itemType.prefix"),
  };

  return (
    <SharedItemTile
      color={color}
      item={{
        ...item,
        rarity: item.rarity ?? ItemRarity.COMMON,
      }}
      labels={labels}
      renderStat={renderStat}
      shareIndex={shareIndex}
      shareNickname={shareNickname}
    />
  );
};
