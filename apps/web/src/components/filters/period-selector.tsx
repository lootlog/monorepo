import { Calendar } from "lucide-react";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import type { Period } from "@lootlog/schema/http-scalars";
import { useTranslation } from "react-i18next";

interface PeriodSelectorProps<TPeriod extends Period> {
  /** The periods offered, in display order. */
  options: ReadonlyArray<TPeriod>;
  value: TPeriod;
  onValueChange: (period: TPeriod) => void;
  allLabel?: string;
  placeholder?: string;
  width?: string;
  className?: string;
  /** The period differs from the page default. */
  active?: boolean;
}

export function PeriodSelector<TPeriod extends Period>({
  options,
  value,
  onValueChange,
  allLabel,
  placeholder,
  width = "w-[200px]",
  className,
  active,
}: PeriodSelectorProps<TPeriod>) {
  const { t } = useTranslation();

  const periodOptions = options.map((period) => ({
    value: period,
    label:
      period === "all"
        ? (allLabel ?? t("common.periodOptions.all"))
        : t(`common.periodOptions.${period}`),
  }));

  return (
    <FilterPopover
      icon={Calendar}
      options={periodOptions}
      value={value}
      onValueChange={onValueChange}
      placeholder={placeholder ?? t("common.filterLabels.period")}
      emptyMessage={t("common.noResults")}
      width={width}
      triggerClassName={className}
      showSearch={false}
      active={active}
    />
  );
}
