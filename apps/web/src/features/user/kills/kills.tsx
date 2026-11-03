import { countActiveKillStatsFilters } from "@/features/kills/components/count-active-kill-stats-filters";
import {
  FILTERED_TABLE_HEADER_CLASS,
  RESULTS_TABLE_MEDIA_QUERY,
} from "@/components/common/page-sticky-table-header";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type inferParserType,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useDebounceCallback, useMediaQuery } from "usehooks-ts";
import { type SortingState, useTable } from "@tanstack/react-table";
import { Table } from "@lootlog/ui/components/table";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { Button } from "@lootlog/ui/components/button";
import { EmptyState } from "@/components/common/empty-state";
import { ResultsSurface } from "@/components/common/results-surface";
import { CardListSkeleton } from "@/components/common/card-list-skeleton";
import { CircleAlert, FilterX, SearchX } from "lucide-react";
import {
  useKillsFilterProps,
  type KillsFiltersState,
} from "./components/use-kills-filter-props";
import { KillStatsFilters } from "@/features/kills/components/kill-stats-filters";
import { KillStatsSearch } from "@/features/kills/components/kill-stats-search";
import { KillStatsStackedFilters } from "@/features/kills/components/kill-stats-stacked-filters";
import { createKillsColumns } from "./components/kills-columns";
import { KillsMobileList } from "./components/kills-mobile-list";
import { KillsMobileCardSkeleton } from "./components/kills-mobile-card-skeleton";
import { NPC_TYPES, type NpcType } from "@/features/user/kills/npc-types";
import {
  type KillsControllerGetUserNpcKillsParams,
  useKillsControllerGetUserNpcKills,
} from "@lootlog/client/main";

import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";
import { sortingTableFeatures } from "@/lib/tanstack-table-features";
import { useCursorStack } from "@/hooks/use-cursor-stack";

const KILL_STATS_PERIODS = [
  "all",
  "24h",
  "3d",
  "7d",
  "14d",
  "30d",
] as const satisfies KillStatsPeriod[];

const killsSearchParsers = {
  world: parseAsString,
  npcType: parseAsArrayOf(parseAsStringLiteral(NPC_TYPES)),
  search: parseAsString.withDefault(""),
  minLvl: parseAsString.withDefault(""),
  maxLvl: parseAsString.withDefault(""),
  period: parseAsStringLiteral(KILL_STATS_PERIODS).withDefault("all"),
};

const ITEMS_PER_PAGE = 20;

const DRAFT_PUBLISH_DELAY_MS = 500;

const getKillsFilters = (
  query: inferParserType<typeof killsSearchParsers>,
): KillsFiltersState => ({
  world: query.world ?? undefined,
  npcTypes: query.npcType?.length ? query.npcType : undefined,
  search: query.search || undefined,
  minLvl: query.minLvl ? Number(query.minLvl) : undefined,
  maxLvl: query.maxLvl ? Number(query.maxLvl) : undefined,
  period: query.period,
});

const hasKillsFilters = (filters: KillsFiltersState) =>
  Boolean(filters.world) ||
  Boolean(filters.npcTypes?.length) ||
  Boolean(filters.search) ||
  Boolean(filters.minLvl) ||
  Boolean(filters.maxLvl) ||
  filters.period !== "all";

export const KillsPage: React.FC = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useQueryStates(killsSearchParsers);
  const usesTable = useMediaQuery(RESULTS_TABLE_MEDIA_QUERY);

  // The search keeps a local draft; the URL (and with it the request) only
  // follows once typing pauses. The level range debounces its own drafts.
  const [searchDraft, setSearchDraft] = useState(query.search);

  const publishSearch = useDebounceCallback(
    (search: string) => setQuery({ search }),
    DRAFT_PUBLISH_DELAY_MS,
  );

  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalKills", desc: true },
  ]);

  const filters = getKillsFilters(query);

  const sortOrder: KillsControllerGetUserNpcKillsParams["sortOrder"] =
    sorting[0]?.desc === false ? "asc" : "desc";

  const sortBy: KillsControllerGetUserNpcKillsParams["sortBy"] =
    sorting[0]?.id === "npcLvl" ? "level" : "kills";

  // A cursor is valid only for the filters and sort it was issued for.
  const pages = useCursorStack(JSON.stringify({ filters, sortOrder, sortBy }));

  const { cursor, pageIndex } = pages;
  const firstRank = pageIndex * ITEMS_PER_PAGE;

  const npcKillsParams: KillsControllerGetUserNpcKillsParams = {
    world: filters.world,
    npcTypes: filters.npcTypes,
    search: filters.search,
    npcLevelMin: filters.minLvl,
    npcLevelMax: filters.maxLvl,
    period: filters.period,
    cursor,
    limit: ITEMS_PER_PAGE,
    sortOrder,
    sortBy,
  };

  const { data, isLoading, isError, isFetching, refetch } =
    useKillsControllerGetUserNpcKills(npcKillsParams, {
      query: {
        staleTime: 30_000,
      },
    });

  const handleWorldChange = (world: string | undefined) => {
    setQuery({ world: world ?? null });
  };

  const handleNpcTypeChange = (npcTypes: NpcType[] | undefined) => {
    setQuery({ npcType: npcTypes ?? null });
  };

  const handleSearchChange = (search: string) => {
    setSearchDraft(search);
    publishSearch(search);
  };

  const handleResetFilters = () => {
    publishSearch.cancel();
    setSearchDraft("");
    setQuery({
      world: null,
      npcType: null,
      search: null,
      minLvl: null,
      maxLvl: null,
      period: null,
    });
  };

  const handlePeriodChange = (period: KillStatsPeriod) => {
    setQuery({ period });
  };

  const handleNextPage = () => {
    if (data?.nextCursor) pages.goToNext(data.nextCursor);
  };

  const filterProps = useKillsFilterProps({
    filters,
    minLvl: query.minLvl,
    maxLvl: query.maxLvl,
    onWorldChange: handleWorldChange,
    onNpcTypeChange: handleNpcTypeChange,
    onMinLvlChange: (minLvl) => setQuery({ minLvl: minLvl || null }),
    onMaxLvlChange: (maxLvl) => setQuery({ maxLvl: maxLvl || null }),
    onPeriodChange: handlePeriodChange,
  });

  const columns = createKillsColumns(firstRank);

  const table = useTable({
    features: sortingTableFeatures,
    data: data?.items || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    manualSorting: true,
  });

  const hasActiveFilters = hasKillsFilters(filters);

  const renderResults = () => {
    if (isLoading) {
      return (
        <TableRowsSkeleton
          rows={ITEMS_PER_PAGE}
          withHeader
          withNpcTile
          trailingColumns={2}
          mobileList={<CardListSkeleton card={<KillsMobileCardSkeleton />} />}
        />
      );
    }

    if (isError && !data) {
      return (
        <div className="p-3">
          <EmptyState
            fill
            icon={CircleAlert}
            title={t("statistics.killsLoadError")}
            action={
              <Button
                variant="outline"
                loading={isFetching}
                onClick={() => void refetch()}
              >
                {t("common.actions.retry")}
              </Button>
            }
          />
        </div>
      );
    }

    if (!data || data.items.length === 0) {
      return (
        <div className="p-3">
          <EmptyState
            fill
            icon={SearchX}
            title={t(
              hasActiveFilters
                ? "kills.ranking.filteredNoData"
                : "kills.ranking.noData",
            )}
            action={
              hasActiveFilters && (
                <Button variant="outline" onClick={handleResetFilters}>
                  <FilterX data-icon="inline-start" aria-hidden />
                  {t("statistics.clearFilters")}
                </Button>
              )
            }
          />
        </div>
      );
    }

    if (!usesTable) {
      return <KillsMobileList npcs={data.items} startRank={firstRank} />;
    }

    return (
      <Table className="border-b">
        <TanStackTableHeader
          table={table}
          className={FILTERED_TABLE_HEADER_CLASS}
          rowClassName="border-b-1! border-border"
          headClassName="whitespace-nowrap"
        />
        <TanStackTableBody
          table={table}
          rowClassName="h-14 border-b border-border hover:bg-muted/40"
          cellClassName="whitespace-nowrap"
        />
      </Table>
    );
  };

  const totalKills = data?.total ?? 0;

  return (
    <ScrollArea data-under-top-bar className="h-full min-h-0">
      <h1 className="sr-only">{t("kills.ranking.title")}</h1>
      <ResultsSurface
        search={
          <KillStatsSearch
            value={searchDraft}
            placeholder={t("kills.ranking.search")}
            onChange={handleSearchChange}
          />
        }
        filters={<KillStatsFilters {...filterProps} />}
        stackedFilters={<KillStatsStackedFilters {...filterProps} />}
        activeFilterCount={countActiveKillStatsFilters(filterProps)}
        filtersLabel={t("kills.filters.title")}
        scrollResetKey={pageIndex}
        footer={
          <TablePaginationFooter
            totalLabel={t("kills.ranking.total", { count: totalKills })}
            hasPrev={pages.hasPrev}
            hasNext={Boolean(data?.nextCursor)}
            onPreviousPage={pages.goToPrevious}
            onNextPage={handleNextPage}
          />
        }
      >
        {renderResults()}
      </ResultsSurface>
    </ScrollArea>
  );
};
