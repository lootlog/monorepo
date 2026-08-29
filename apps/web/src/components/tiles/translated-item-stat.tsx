import type { ItemDisplayValue } from "@lootlog/ui/components/item-stat-utils";
import type { FC } from "react";
import { Trans, useTranslation } from "react-i18next";

type TranslatedItemStatProps = {
  displayValue: ItemDisplayValue;
};

const STAT_VALUE_SEPARATOR = ",\u00A0";
const numericTextPattern =
  /^[+-]?\d+(?:[.,]\d+)?(?:\s+-\s+[+-]?\d+(?:[.,]\d+)?)*$/;

function formatStringValue(rawValue: string) {
  return numericTextPattern.test(rawValue)
    ? rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, " ")
    : rawValue;
}

function mapUntranslatedArrayValues(rawValues: string[]) {
  return rawValues.reduce<Record<string, string>>(
    (values, rawValue, valueIndex) => {
      values[`value${valueIndex + 1}`] = formatStringValue(rawValue);
      return values;
    },
    {},
  );
}

export const TranslatedItemStat: FC<TranslatedItemStatProps> = ({
  displayValue,
}) => {
  const { t } = useTranslation();
  if (!displayValue.key) {
    return null;
  }

  let translatedValues: Record<string, string | number | boolean | undefined>;
  if (!Array.isArray(displayValue.value)) {
    translatedValues = {
      value:
        typeof displayValue.value === "string"
          ? formatStringValue(displayValue.value)
          : displayValue.value,
    };
  } else if (!displayValue.translateKey) {
    translatedValues = mapUntranslatedArrayValues(displayValue.value);
  } else {
    translatedValues = {
      value: displayValue.value
        .map((translationKey) =>
          t(`${displayValue.translateKey}.${translationKey}`),
        )
        .join(STAT_VALUE_SEPARATOR),
    };
  }

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
