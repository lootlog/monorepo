import type { TFunction } from "i18next";
import type { Period } from "@/store/battle-filters.store";

export const getPeriodOptions = (
  t: TFunction,
): { value: Period; label: string }[] => [
  { value: "7d", label: t("battlePanel.filters.periodOptions.7d") },
  { value: "30d", label: t("battlePanel.filters.periodOptions.30d") },
  { value: "90d", label: t("battlePanel.filters.periodOptions.90d") },
  { value: "all", label: t("battlePanel.filters.periodOptions.all") },
];
