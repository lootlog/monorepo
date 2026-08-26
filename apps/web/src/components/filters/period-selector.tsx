import { Calendar } from "lucide-react";
import {
  FilterPopover,
  type FilterPopoverOption,
} from "@lootlog/ui/components/filter-popover";
import type { Period } from "@/features/user/battle-panel/battle-panel-search";
import { useTranslation } from "react-i18next";

interface PeriodSelectorProps {
  value: Period;
  onValueChange: (period: Period) => void;
  excludePeriods?: Period[];
  allLabel?: string;
  placeholder?: string;
  width?: string;
  className?: string;
}

export function PeriodSelector({
  value,
  onValueChange,
  excludePeriods = [],
  allLabel,
  placeholder,
  width = "w-[200px]",
  className,
}: PeriodSelectorProps) {
  const { t } = useTranslation();
  const allPeriods = [
    { value: "24h" as const, label: t("common.periodOptions.24h") },
    { value: "3d" as const, label: t("common.periodOptions.3d") },
    { value: "7d" as const, label: t("common.periodOptions.7d") },
    { value: "14d" as const, label: t("common.periodOptions.14d") },
    { value: "30d" as const, label: t("common.periodOptions.30d") },
    { value: "90d" as const, label: t("common.periodOptions.90d") },
    { value: "180d" as const, label: t("common.periodOptions.180d") },
    {
      value: "all" as const,
      label: allLabel ?? t("common.periodOptions.all"),
    },
  ];
  const availablePeriods = allPeriods.filter(
    (period) => !excludePeriods.includes(period.value),
  );

  const options: FilterPopoverOption<Period>[] = availablePeriods.map(
    (period) => ({
      value: period.value,
      label: period.label,
    }),
  );

  return (
    <FilterPopover
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder ?? t("common.filterLabels.period")}
      icon={Calendar}
      width={width}
      triggerClassName={className}
      showSearch={false}
    />
  );
}
