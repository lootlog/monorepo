import { parseKillStatsLevel } from "@/features/kills/parse-kill-stats-level";
import { FilterBar } from "@/components/common/filter-bar";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { LevelRangeFilter } from "@/components/filters/level-range-filter";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";
import { SearchInput } from "@/components/ui/search-input";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";
import { KillStatsNpcTypeSelect } from "@/features/kills/components/kill-stats-npc-type-select";
import { Button } from "@lootlog/ui/components/button";
import { Label } from "@lootlog/ui/components/label";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";

type KillStatsFilterBarProps = {
  /** Omit where the world is the Organization's context instead of a filter. */
  world?: {
    value: string | null;
    /** Worlds to offer; omit to list the current guild's worlds. */
    worlds?: string[];
    onChange: (value: string | null) => void;
  };
  period: KillStatsPeriod | undefined;
  onPeriodChange: (value: KillStatsPeriod) => void;
  search?: {
    /** Omit to leave the input uncontrolled, for callers that debounce on their own. */
    value?: string;
    placeholder: string;
    onChange: (value: string) => void;
  };
  /** Bounds are kept as the persisted strings ("" when unset). */
  level?: {
    minLvl: string;
    maxLvl: string;
    onMinLvlChange: (value: string) => void;
    onMaxLvlChange: (value: string) => void;
  };
  npcType?: {
    types: readonly string[];
    value: string | null | undefined;
    onValueChange: (value: string | null) => void;
  };
};

// Callers debounce the request on their own, so the inputs commit sooner than
// the level range's default.
const LEVEL_COMMIT_DELAY_MS = 300;

const toLevelParam = (value: number | undefined) =>
  value === undefined ? "" : String(value);

export const KillStatsFilterBar = ({
  world,
  period = "all",
  onPeriodChange,
  search,
  level,
  npcType,
}: KillStatsFilterBarProps) => {
  const { t } = useTranslation();

  const renderLevelRange = (layout: "inline" | "fill") =>
    level && (
      <LevelRangeFilter
        layout={layout}
        debounceMs={LEVEL_COMMIT_DELAY_MS}
        minLevel={parseKillStatsLevel(level.minLvl)}
        maxLevel={parseKillStatsLevel(level.maxLvl)}
        onMinLevelChange={(value) => level.onMinLvlChange(toLevelParam(value))}
        onMaxLevelChange={(value) => level.onMaxLvlChange(toLevelParam(value))}
      />
    );

  return (
    <FilterBar ariaLabel={t("kills.filters.title")}>
      {search && (
        <SearchInput
          aria-label={search.placeholder}
          placeholder={search.placeholder}
          value={search.value}
          onChange={(event) => search.onChange(event.target.value)}
          size="lg"
          wrapperClassName="min-w-0 flex-1 md:w-[220px] md:flex-none"
        />
      )}

      <div className={search ? "md:hidden" : "w-full md:hidden"}>
        <MobileFiltersDrawer
          title={t("kills.filters.title")}
          closeLabel={t("kills.filters.close")}
          trigger={
            search ? (
              <Button
                variant="outline"
                size="icon-lg"
                aria-label={t("kills.filters.title")}
              >
                <Filter aria-hidden="true" />
              </Button>
            ) : (
              <Button
                variant="outline"
                size="lg"
                className="w-full justify-start"
              >
                <Filter data-icon="inline-start" aria-hidden="true" />
                {t("kills.filters.title")}
              </Button>
            )
          }
        >
          {world && (
            <div className="space-y-2">
              <Label>{t("kills.filters.world")}</Label>
              <WorldSwitcher
                value={world.value}
                onValueChange={world.onChange}
                worlds={world.worlds}
                showAllOption
                width="w-full"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>{t("kills.filters.period")}</Label>
            <KillStatsPeriodSelect
              value={period}
              onValueChange={onPeriodChange}
              className="w-full"
            />
          </div>
          {npcType && (
            <div className="space-y-2">
              <Label>{t("kills.filters.npcType")}</Label>
              <KillStatsNpcTypeSelect {...npcType} width="w-full" />
            </div>
          )}
          {level && (
            <div className="space-y-2">
              <Label>{t("kills.filters.levelRange")}</Label>
              {renderLevelRange("fill")}
            </div>
          )}
        </MobileFiltersDrawer>
      </div>

      <div className="hidden flex-wrap items-center gap-2 md:flex">
        {world && (
          <WorldSwitcher
            value={world.value}
            onValueChange={world.onChange}
            worlds={world.worlds}
            showAllOption
          />
        )}
        <KillStatsPeriodSelect
          value={period}
          onValueChange={onPeriodChange}
          className="w-[200px]"
        />
        {npcType && <KillStatsNpcTypeSelect {...npcType} />}
        {renderLevelRange("inline")}
      </div>
    </FilterBar>
  );
};
