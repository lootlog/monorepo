import { t } from "@/i18n/messages";
import { formatDecimal, formatNumber } from "@lootlog/domain/locale";

export const formatPercent = (value: number) =>
  t("calculators.percent", {
    value: formatDecimal(value),
  });

export const formatScales = (value: number) =>
  t("calculators.scales", { value: formatNumber(value) });
