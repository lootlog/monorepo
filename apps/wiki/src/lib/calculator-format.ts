import { t } from "@/i18n/messages";

/** A percentage as the calculators show it: `33,08%`. */
export const formatPercent = (value: number) =>
  t("calculators.percent", {
    value: value.toLocaleString("pl-PL", { maximumFractionDigits: 2 }),
  });

/** A count of dragon scales: `10 000 SŁ`. */
export const formatScales = (value: number) =>
  t("calculators.scales", { value: value.toLocaleString("pl-PL") });
