import { DEFAULT_LOOT_STATS_SETTINGS } from "../hooks/use-loot-stats-settings";
import { FilterBar } from "@/components/common/filter-bar";
import { PeriodSelector } from "@/components/filters/period-selector";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { LootStatsExcludeColossus } from "./loot-stats-exclude-colossus";
import { LootStatsStackedFilters } from "./loot-stats-stacked-filters";

type LootStatsFilterBarProps = ComponentProps<typeof LootStatsStackedFilters>;

export const LootStatsFilterBar = (props: LootStatsFilterBarProps) => {
  const { t } = useTranslation();

  return (
    <FilterBar
      ariaLabel={t("kills.filters.title")}
      stackedFilters={<LootStatsStackedFilters {...props} />}
      activeFilterCount={
        [
          props.period !== DEFAULT_LOOT_STATS_SETTINGS.period,
          props.excludeColossus,
        ].filter(Boolean).length
      }
    >
      <PeriodSelector
        value={props.period}
        onValueChange={props.onPeriodChange}
      />
      {/* Framed like the selects next to it. */}
      <div className="flex h-10 items-center rounded-lg border border-input bg-background px-3 transition-colors hover:border-foreground/20 hover:bg-foreground/[0.04]">
        <LootStatsExcludeColossus
          id="loot-stats-exclude-colossus"
          checked={props.excludeColossus}
          onCheckedChange={props.onExcludeColossusChange}
        />
      </div>
    </FilterBar>
  );
};
