import { WorldSwitcher } from "@/components/common/world-switcher";
import { FilterPanelField } from "@/components/filters/filter-panel-field";
import type { KillStatsFiltersProps } from "@/features/kills/components/kill-stats-filters";
import { KillStatsLevelRange } from "@/features/kills/components/kill-stats-level-range";
import { KillStatsNpcTypeSelect } from "@/features/kills/components/kill-stats-npc-type-select";
import { KillStatsPeriodSelect } from "@/features/kills/components/kill-stats-period-select";
import { useTranslation } from "react-i18next";

/** The kill statistics filters stacked for the panel narrow pages open. */
export const KillStatsStackedFilters = ({
  world,
  period = "all",
  onPeriodChange,
  level,
  npcType,
}: KillStatsFiltersProps) => {
  const { t } = useTranslation();

  return (
    <>
      {world && (
        <FilterPanelField label={t("kills.filters.world")}>
          <WorldSwitcher
            value={world.value}
            onValueChange={world.onChange}
            worlds={world.worlds}
            showAllOption
            width="w-full"
          />
        </FilterPanelField>
      )}
      <FilterPanelField label={t("kills.filters.period")}>
        <KillStatsPeriodSelect
          value={period}
          onValueChange={onPeriodChange}
          className="w-full"
        />
      </FilterPanelField>
      {npcType && (
        <FilterPanelField label={t("kills.filters.npcType")}>
          <KillStatsNpcTypeSelect {...npcType} width="w-full" />
        </FilterPanelField>
      )}
      {level && (
        <FilterPanelField label={t("kills.filters.levelRange")}>
          <KillStatsLevelRange level={level} layout="fill" />
        </FilterPanelField>
      )}
    </>
  );
};
