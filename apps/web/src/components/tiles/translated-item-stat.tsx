import {
  getItemStatTemplateValues,
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
        description: <div className="text-center text-muted-foreground" />,
        gold: <span className="text-primary" />,
        legbon: <span className="block w-full text-green-500" />,
        value: <span className="font-bold text-primary" />,
      }}
      i18nKey={`itemStats.${displayValue.key}`}
      values={translatedValues}
    >
      {displayValue.value}
    </Trans>
  );
};
