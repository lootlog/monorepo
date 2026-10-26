import {
  getItemStatTemplateValues,
  ITEM_STAT_TAG_CLASS_NAMES,
  type ItemDisplayValue,
} from "@lootlog/ui/components/item-stat-utils";
import type { FC } from "react";
import { Trans, useTranslation } from "react-i18next";

type TranslatedItemStatProps = {
  displayValue: ItemDisplayValue;
};

export const TranslatedItemStat: FC<TranslatedItemStatProps> = ({
  displayValue,
}) => {
  const { t } = useTranslation();

  if (!displayValue.key) {
    return null;
  }

  const translatedValues = getItemStatTemplateValues(displayValue, (key) =>
    t(key),
  );

  return (
    <Trans
      components={{
        description: <div className={ITEM_STAT_TAG_CLASS_NAMES.description} />,
        gold: <span className={ITEM_STAT_TAG_CLASS_NAMES.gold} />,
        legbon: <span className={ITEM_STAT_TAG_CLASS_NAMES.legbon} />,
        value: <span className={ITEM_STAT_TAG_CLASS_NAMES.value} />,
      }}
      i18nKey={`itemStats.${displayValue.key}`}
      values={translatedValues}
    >
      {displayValue.value}
    </Trans>
  );
};
