import { Period } from "@lootlog/schema/http-scalars";
import { FilterPanelField } from "@/components/filters/filter-panel-field";
import { PeriodSelector } from "@/components/filters/period-selector";
import type { LootsControllerGetLootStatsPeriod } from "@lootlog/client/main";
import { useTranslation } from "react-i18next";
import { LootStatsExcludeColossus } from "./loot-stats-exclude-colossus";

type LootStatsStackedFiltersProps = {
  period: LootsControllerGetLootStatsPeriod;
  excludeColossus: boolean;
  onPeriodChange: (value: LootsControllerGetLootStatsPeriod) => void;
  onExcludeColossusChange: (value: boolean) => void;
};

export const LootStatsStackedFilters = ({
  period,
  excludeColossus,
  onPeriodChange,
  onExcludeColossusChange,
}: LootStatsStackedFiltersProps) => {
  const { t } = useTranslation();

  return (
    <>
      <FilterPanelField label={t("kills.filters.period")}>
        <PeriodSelector
          options={Period.literals}
          value={period}
          onValueChange={onPeriodChange}
          width="w-full"
        />
      </FilterPanelField>
      <FilterPanelField>
        <LootStatsExcludeColossus
          id="loot-stats-panel-exclude-colossus"
          checked={excludeColossus}
          onCheckedChange={onExcludeColossusChange}
        />
      </FilterPanelField>
    </>
  );
};
