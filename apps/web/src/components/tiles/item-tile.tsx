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

const STAT_VALUE_SEPARATOR = ",\u00A0";

const formatStringValue = (rawValue: string) => {
  return rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const formatValue = (
  rawValue: string | string[] | number | boolean | undefined,
) => {
  if (Array.isArray(rawValue)) {
    return rawValue.join(STAT_VALUE_SEPARATOR);
  }

  if (typeof rawValue === "string") {
    return formatStringValue(rawValue);
  }

  return rawValue;
};

const mapUntranslatedArrayValues = (rawValues: string[]) => {
  return rawValues.reduce<Record<string, string>>(
    (acc, rawValue, valueIndex) => {
      acc[`value${valueIndex + 1}`] = formatStringValue(rawValue);

      return acc;
    },
    {},
  );
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
      [ItemRarity.COMMON]: t("itemRarity.COMMON"),
      [ItemRarity.HEROIC]: t("itemRarity.HEROIC"),
      [ItemRarity.LEGENDARY]: t("itemRarity.LEGENDARY"),
      [ItemRarity.UNIQUE]: t("itemRarity.UNIQUE"),
      [ItemRarity.UPGRADED]: t("itemRarity.UPGRADED"),
    },
    type: typeLabels,
    typePrefix: t("itemType.prefix"),
  };

  const getTranslatedValues = (displayValue: ItemDisplayValue) => {
    if (!Array.isArray(displayValue.value)) {
      return { value: formatValue(displayValue.value) };
    }

    if (!displayValue.translateKey) {
      return mapUntranslatedArrayValues(displayValue.value);
    }

    return {
      value: displayValue.value
        .map((translationKey) =>
          t(`${displayValue.translateKey}.${translationKey}`),
        )
        .join(STAT_VALUE_SEPARATOR),
    };
  };

  const renderStat = (displayValue: ItemDisplayValue) => {
    if (!displayValue.key) {
      return null;
    }

    const translatedValues = getTranslatedValues(displayValue);

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
