import { useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { cn } from "cn";
import {
  useKillsControllerGetUserKillAnalytics,
  useKillsControllerGetUserKillStats,
} from "@lootlog/client/main";
import { FilterBar } from "@/components/common/filter-bar";
import { AnimatedToggleGroup } from "@/components/ui/animated-toggle-group";
import { PageTabsLayout } from "@/components/layout/page-tabs-layout";
import { StatisticsQueryState } from "./statistics-query-state";
import {
  STATISTICS_RANKINGS,
  STATISTICS_TABS,
  type StatisticsSearch,
} from "./statistics-search";
import { StatisticsContent } from "./statistics-content";
import { StatisticsOverviewSkeleton } from "./statistics-overview-skeleton";
import {
  countActiveStatisticsFilters,
  StatisticsFilters,
  type StatisticsFiltersProps,
} from "./statistics-filters";
import { StatisticsStackedFilters } from "./statistics-stacked-filters";
import { StatisticsCharacterSelect } from "./statistics-character-select";
import { StatisticsCharacterHistoryNote } from "./statistics-character-history-note";

export function Statistics() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/_authenticated/@me/statistics" });
  const navigate = useNavigate({ from: "/@me/statistics" });
  const isMonsters = search.tab === "monsters";

  const update = (changes: Partial<StatisticsSearch>) => {
    void navigate({ search: (current) => ({ ...current, ...changes }) });
  };

  const analytics = useKillsControllerGetUserKillAnalytics(
    {
      days: ({ 7: "7", 30: "30", 90: "90", 365: "365" } as const)[search.days],
      world: search.world,
      characterId: search.characterId,
      // Only the monster ranking narrows to a type; the totals never do.
      npcType: isMonsters ? search.npcType : undefined,
    },
    { query: { staleTime: 30_000 } },
  );

  const lifetime = useKillsControllerGetUserKillStats(undefined, {
    query: { staleTime: 60_000 },
  });

  const worlds = Object.keys(lifetime.data?.overview.killsByWorld ?? {});

  if (search.world && !worlds.includes(search.world)) worlds.push(search.world);
  const data = analytics.data;

  // Sections run edge to edge; a lone notice or placeholder keeps an inset.
  const inset =
    data === undefined
      ? analytics.isError || search.tab !== "overview"
      : data.meta.coverage === "unavailable";

  const filterProps: StatisticsFiltersProps = {
    world: search.world,
    worlds,
    // A character plays on one world; another world leaves it behind.
    onWorldChange: (world) =>
      update({
        world,
        characterId: world === search.world ? search.characterId : undefined,
      }),
    days: search.days,
    onDaysChange: (days) => update({ days }),
    npcType: isMonsters
      ? {
          value: search.npcType,
          onChange: (npcType) => update({ npcType }),
        }
      : undefined,
  };

  return (
    <PageTabsLayout
      ariaLabel={t("statistics.title")}
      activeId={search.tab}
      tabs={STATISTICS_TABS.map((tab) => ({
        id: tab,
        label: t(`statistics.${tab}`),
        href: "/@me/statistics",
        search: { ...search, tab },
      }))}
    >
      <div className="min-w-0">
        <h1 className="sr-only">{t("statistics.title")}</h1>
        <FilterBar
          ariaLabel={t("kills.filters.title")}
          search={
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <StatisticsCharacterSelect
                characterId={search.characterId}
                onCharacterChange={(character) =>
                  update({
                    characterId: character?.characterId,
                    world: character ? character.world : search.world,
                  })
                }
              />
              {isMonsters && (
                <AnimatedToggleGroup
                  size="lg"
                  label={t("statistics.ranking")}
                  value={search.ranking ?? "top"}
                  onValueChange={(ranking) =>
                    update({ ranking: ranking === "top" ? undefined : ranking })
                  }
                  options={STATISTICS_RANKINGS.map((ranking) => ({
                    value: ranking,
                    label: t(`statistics.rankings.${ranking}`),
                  }))}
                />
              )}
            </div>
          }
          stackedFilters={<StatisticsStackedFilters {...filterProps} />}
          activeFilterCount={countActiveStatisticsFilters(filterProps)}
        >
          <StatisticsFilters {...filterProps} />
        </FilterBar>
        {data?.meta.characterId &&
          data.meta.trackedSince &&
          data.meta.coverage === "partial" && (
            <StatisticsCharacterHistoryNote
              trackedSince={data.meta.trackedSince}
            />
          )}
        <div className={cn(inset && "p-3")}>
          <StatisticsQueryState
            query={analytics}
            loading={
              search.tab === "overview" ? (
                <StatisticsOverviewSkeleton />
              ) : undefined
            }
          >
            {data && <StatisticsContent data={data} search={search} />}
          </StatisticsQueryState>
        </div>
      </div>
    </PageTabsLayout>
  );
}
