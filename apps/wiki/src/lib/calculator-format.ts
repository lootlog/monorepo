import { t } from "@/i18n/messages";
import { formatDecimal, formatNumber } from "@lootlog/domain/locale";

/** A percentage as the calculators show it: `33,08%`. */
export const formatPercent = (value: number) =>
  t("calculators.percent", {
    value: formatDecimal(value),
  });

/** A count of dragon scales: `10 000 SŁ`. */
export const formatScales = (value: number) =>
  t("calculators.scales", { value: formatNumber(value) });
