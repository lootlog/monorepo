import { FilterPopover } from "@lootlog/ui/components/filter-popover";
import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import { STATISTICS_DAYS, type StatisticsDays } from "./statistics-search";

type StatisticsPeriodSelectProps = {
  value: StatisticsDays;
  onValueChange: (value: StatisticsDays) => void;
  width?: string;
};

export function StatisticsPeriodSelect({
  value,
  onValueChange,
  width = "w-[140px]",
}: StatisticsPeriodSelectProps) {
  const { t } = useTranslation();

  return (
    <FilterPopover
      icon={Calendar}
      options={STATISTICS_DAYS.map((days) => ({
        value: String(days),
        label: t("statistics.days", { count: days }),
      }))}
      value={String(value)}
      onValueChange={(days) => {
        const next = STATISTICS_DAYS.find((option) => String(option) === days);

        if (next !== undefined) onValueChange(next);
      }}
      placeholder={t("statistics.period")}
      emptyMessage={t("common.noResults")}
      width={width}
      showSearch={false}
      active={value !== 30}
    />
  );
}
