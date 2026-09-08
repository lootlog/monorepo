import { useTranslation } from "react-i18next";
import type { GroupFightPeriod } from "@lootlog/schema/group-fights";
import { FilterPopover } from "@lootlog/ui/components/filter-popover";

const PERIODS = [
  "today",
  "week",
  "month",
  "24h",
  "7d",
  "30d",
  "90d",
  "all",
] as const satisfies readonly GroupFightPeriod[];

export function GroupFightPeriodSelect({
  value,
  onValueChange,
}: {
  value: GroupFightPeriod;
  onValueChange: (period: GroupFightPeriod) => void;
}) {
  const { t } = useTranslation();
  return (
    <FilterPopover<GroupFightPeriod>
      options={PERIODS.map((period) => ({
        value: period,
        label: t(`groupFights.periods.${period}`),
      }))}
      value={value}
      onValueChange={onValueChange}
      placeholder={t("groupFights.period")}
      showSearch={false}
      width="w-[200px]"
    />
  );
}
