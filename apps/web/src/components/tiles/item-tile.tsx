import { ItemTile as SharedItemTile } from "@lootlog/ui/components/item-tile";
import type { ItemDisplayValue } from "@lootlog/ui/components/item-stat-utils";
import { ItemRarity, type Item } from "@/lib/loots/loot-types";
import type { FC } from "react";
import { Trans, useTranslation } from "react-i18next";

export type ItemTileProps = {
  color?: string;
  item: Item;
  shareIndex?: number;
  shareNickname?: string;
};

const formatValue = (
  rawValue: string | string[] | number | boolean | undefined,
) => {
  if (Array.isArray(rawValue)) {
    return rawValue.join(",\u00A0");
  }

  if (typeof rawValue === "string") {
    return rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  return rawValue;
};

export const ItemTile: FC<ItemTileProps> = ({
  color = "",
  item,
  shareIndex,
  shareNickname,
}) => {
  const { t } = useTranslation();
  const labels = {
    obtainedBy: t("loots.list.obtainedBy"),
    rarity: {
      [ItemRarity.COMMON]: t("itemRarity.COMMON"),
      [ItemRarity.HEROIC]: t("itemRarity.HEROIC"),
      [ItemRarity.LEGENDARY]: t("itemRarity.LEGENDARY"),
      [ItemRarity.UNIQUE]: t("itemRarity.UNIQUE"),
      [ItemRarity.UPGRADED]: t("itemRarity.UPGRADED"),
    },
    type: {
      [item.type ?? ""]: item.type ? t(`itemType.${item.type}`) : "",
    },
    typePrefix: t("itemType.prefix"),
  };

  const renderStat = (displayValue: ItemDisplayValue) => {
    if (!displayValue.key) {
      return null;
    }

    const translatedValues =
      Array.isArray(displayValue.value) && !displayValue.translateKey
        ? displayValue.value.reduce(
            (acc: Record<string, string>, rawValue, valueIndex) => {
              acc[`value${valueIndex + 1}`] = formatValue(rawValue) as string;

              return acc;
            },
            {},
          )
        : {
            value:
              displayValue.translateKey && Array.isArray(displayValue.value)
                ? displayValue.value
                    .map((translationKey) =>
                      t(`${displayValue.translateKey}.${translationKey}`),
                    )
                    .join(",\u00A0")
                : formatValue(displayValue.value),
          };

    return (
      <Trans
        components={{
          description: <div className="text-center text-muted-foreground" />,
          gold: <span className="text-primary" />,
          legbon: <span className="text-green-500" />,
          value: <span className="font-bold text-primary" />,
        }}
        i18nKey={`itemStats.${displayValue.key}`}
        values={translatedValues}
      >
        {displayValue.value}
      </Trans>
    );
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
