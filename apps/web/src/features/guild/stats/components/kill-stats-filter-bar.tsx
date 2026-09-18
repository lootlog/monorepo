import { FilterBar } from "@/components/common/filter-bar";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { MobileFiltersDrawer } from "@/components/filters/mobile-filters-drawer";
import { SearchInput } from "@/components/ui/search-input";
import {
  KillStatsPeriodSelect,
  type KillStatsPeriod,
} from "@/features/kills/components/kill-stats-period-select";
import { Button } from "@lootlog/ui/components/button";
import { Label } from "@lootlog/ui/components/label";
import { Filter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LevelFilters } from "./level-filters";
import { StatsNpcTypeSelect } from "./stats-npc-type-select";

type KillStatsFilterBarProps = {
  world: string | null;
  period: KillStatsPeriod | undefined;
  onWorldChange: (value: string | null) => void;
  onPeriodChange: (value: KillStatsPeriod) => void;
  search?: {
    /** Omit to leave the input uncontrolled, for callers that debounce on their own. */
    value?: string;
    placeholder: string;
    onChange: (value: string) => void;
  };
  level?: {
    minLvl: string;
    maxLvl: string;
    onMinLvlChange: (value: string) => void;
    onMaxLvlChange: (value: string) => void;
  };
  npcType?: {
    value: string | null | undefined;
    onValueChange: (value: string | null) => void;
  };
};

const levelSeparator = (
  <span className="text-xs text-muted-foreground" aria-hidden="true">
    –
  </span>
);

export const KillStatsFilterBar = ({
  world,
  period = "all",
  onWorldChange,
  onPeriodChange,
  search,
  level,
  npcType,
}: KillStatsFilterBarProps) => {
  const { t } = useTranslation();

  const levelPlaceholders = {
    minPlaceholder: t("kills.filters.minLevelShort"),
    maxPlaceholder: t("kills.filters.maxLevelShort"),
  };

  return (
    <FilterBar ariaLabel={t("kills.filters.title")}>
      {search && (
        <SearchInput
          aria-label={search.placeholder}
          placeholder={search.placeholder}
          value={search.value}
          onChange={(event) => search.onChange(event.target.value)}
          wrapperClassName="h-10 min-w-0 flex-1 md:w-[220px] md:flex-none"
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
                size="icon"
                className="size-10"
                aria-label={t("kills.filters.title")}
              >
                <Filter aria-hidden="true" />
              </Button>
            ) : (
              <Button variant="outline" className="h-10 w-full justify-start">
                <Filter data-icon="inline-start" aria-hidden="true" />
                {t("kills.filters.title")}
              </Button>
            )
          }
        >
          <div className="space-y-2">
            <Label>{t("kills.filters.world")}</Label>
            <WorldSwitcher
              value={world}
              onValueChange={onWorldChange}
              showAllOption
              width="w-full"
              triggerClassName="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("kills.filters.period")}</Label>
            <KillStatsPeriodSelect
              value={period}
              onValueChange={onPeriodChange}
              className="w-full"
              triggerClassName="h-10"
            />
          </div>
          {npcType && (
            <div className="space-y-2">
              <Label>{t("kills.filters.npcType")}</Label>
              <StatsNpcTypeSelect
                value={npcType.value}
                onValueChange={npcType.onValueChange}
                width="w-full"
              />
            </div>
          )}
          {level && (
            <div className="space-y-2">
              <Label>{t("kills.filters.levelRange")}</Label>
              <div className="flex items-center gap-2">
                <LevelFilters
                  {...level}
                  {...levelPlaceholders}
                  inputClassName="h-10 min-w-0 flex-1"
                  separator={levelSeparator}
                />
              </div>
            </div>
          )}
        </MobileFiltersDrawer>
      </div>

      <div className="hidden flex-wrap items-center gap-2 md:flex">
        <WorldSwitcher
          value={world}
          onValueChange={onWorldChange}
          showAllOption
          width="w-[200px]"
          triggerClassName="h-10"
        />
        <KillStatsPeriodSelect
          value={period}
          onValueChange={onPeriodChange}
          className="w-[200px]"
          triggerClassName="h-10"
        />
        {npcType && (
          <StatsNpcTypeSelect
            value={npcType.value}
            onValueChange={npcType.onValueChange}
          />
        )}
        {level && (
          <div
            role="group"
            aria-label={t("kills.filters.levelRange")}
            className="flex items-center gap-2"
          >
            <LevelFilters
              {...level}
              {...levelPlaceholders}
              inputClassName="h-10 w-[72px]"
              separator={levelSeparator}
            />
          </div>
        )}
      </div>
    </FilterBar>
  );
};
