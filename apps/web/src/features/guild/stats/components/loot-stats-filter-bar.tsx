import { DEFAULT_LOOT_STATS_SETTINGS } from "../hooks/use-loot-stats-settings";
import { FilterBar } from "@/components/common/filter-bar";
import { PeriodSelector } from "@/components/filters/period-selector";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@lootlog/ui/components/button";
import { Ban, Check } from "lucide-react";
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
        active={props.period !== "7d"}
      />
      <Button
        type="button"
        variant="chip"
        size="lg"
        aria-pressed={props.excludeColossus}
        data-active={props.excludeColossus || undefined}
        onClick={() => props.onExcludeColossusChange(!props.excludeColossus)}
      >
        {props.excludeColossus ? (
          <Check aria-hidden="true" />
        ) : (
          <Ban className="text-muted-foreground" aria-hidden="true" />
        )}
        {t("loots.stats.excludeColossus")}
      </Button>
    </FilterBar>
  );
};
