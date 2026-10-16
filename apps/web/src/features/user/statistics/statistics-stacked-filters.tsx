import { WorldSwitcher } from "@/components/common/world-switcher";
import { FilterPanelField } from "@/components/filters/filter-panel-field";
import { KillStatsNpcTypeSelect } from "@/features/kills/components/kill-stats-npc-type-select";
import { TRACKABLE_NPC_TYPES } from "@/features/user/kills/npc-types";
import { useTranslation } from "react-i18next";
import { type StatisticsFiltersProps, toNpcType } from "./statistics-filters";
import { StatisticsPeriodSelect } from "./statistics-period-select";
import { StatisticsSortSelect } from "./statistics-sort-select";

/** The statistics filters stacked for the panel narrow pages open. */
export function StatisticsStackedFilters({
  world,
  worlds,
  onWorldChange,
  days,
  onDaysChange,
  npcType,
  sort,
}: StatisticsFiltersProps) {
  const { t } = useTranslation();

  return (
    <>
      <FilterPanelField label={t("kills.filters.world")}>
        <WorldSwitcher
          value={world ?? null}
          onValueChange={(next) => onWorldChange(next ?? undefined)}
          worlds={worlds}
          showAllOption
          width="w-full"
        />
      </FilterPanelField>
      <FilterPanelField label={t("kills.filters.period")}>
        <StatisticsPeriodSelect
          value={days}
          onValueChange={onDaysChange}
          width="w-full"
        />
      </FilterPanelField>
      {npcType && (
        <FilterPanelField label={t("kills.filters.npcType")}>
          <KillStatsNpcTypeSelect
            types={TRACKABLE_NPC_TYPES}
            value={npcType.value}
            onValueChange={(type) => npcType.onChange(toNpcType(type))}
            width="w-full"
          />
        </FilterPanelField>
      )}
      {sort && (
        <StatisticsSortSelect
          tab={sort.tab}
          fields={sort.fields}
          value={sort.value}
          onValueChange={sort.onChange}
        />
      )}
    </>
  );
}
