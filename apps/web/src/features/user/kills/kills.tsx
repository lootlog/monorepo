import { PageHeader } from "@/components/common/page-header";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  type inferParserType,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useDebounceCallback } from "usehooks-ts";
import { type SortingState, useTable } from "@tanstack/react-table";
import { Table } from "@lootlog/ui/components/table";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { TanStackTableBody } from "@/components/ui/tanstack-table-body";
import { TanStackTableHeader } from "@/components/ui/tanstack-table-header";
import { TableRowsSkeleton } from "@/components/ui/table-rows-skeleton";
import { Button } from "@lootlog/ui/components/button";
import { EmptyState } from "@/components/common/empty-state";
import { ResultsSurface } from "@/components/common/results-surface";
import { CircleAlert, FilterX, SearchX, Skull } from "lucide-react";
import {
  KillsFilters,
  type KillsFiltersState,
} from "./components/kills-filters";
import { createKillsColumns } from "./components/kills-columns";
import { KillsMobileList } from "./components/kills-mobile-list";
import { NPC_TYPES, type NpcType } from "@/features/user/kills/npc-types";
import {
  type KillsControllerGetUserNpcKillsParams,
  getKillsControllerGetUserNpcKillsQueryKey,
  useKillsControllerGetUserNpcKills,
} from "@lootlog/client/main";

import type { KillStatsPeriod } from "@/features/kills/components/kill-stats-period-select";
import { useIsMobile } from "@lootlog/ui/hooks/use-mobile";
import { sortingTableFeatures } from "@/lib/tanstack-table-features";

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
  cursor: parseAsInteger.withDefault(0),
  minLvl: parseAsString.withDefault(""),
  maxLvl: parseAsString.withDefault(""),
  period: parseAsStringLiteral(KILL_STATS_PERIODS).withDefault("all"),
};

const ITEMS_PER_PAGE = 20;

const DRAFT_PUBLISH_DELAY_MS = 500;

type KillsDrafts = {
  search: string;
  minLvl: string;
  maxLvl: string;
};

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
  const isMobile = useIsMobile();

  // Text inputs keep a local draft; the URL (and with it the request) only
  // follows once typing pauses.
  const [drafts, setDrafts] = useState<KillsDrafts>({
    search: query.search,
    minLvl: query.minLvl,
    maxLvl: query.maxLvl,
  });

  const publishQuery = useDebounceCallback(setQuery, DRAFT_PUBLISH_DELAY_MS);

  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalKills", desc: true },
  ]);

  const filters = getKillsFilters(query);

  const { cursor } = query;

  const sortOrder: KillsControllerGetUserNpcKillsParams["sortOrder"] =
    sorting[0]?.desc === false ? "asc" : "desc";

  const sortBy: KillsControllerGetUserNpcKillsParams["sortBy"] =
    sorting[0]?.id === "npcLvl" ? "level" : "kills";

  const npcKillsParams: KillsControllerGetUserNpcKillsParams = {
    ...filters,
    cursor,
    limit: ITEMS_PER_PAGE,
    sortOrder,
    sortBy,
    period: filters.period === "all" ? undefined : filters.period,
  };

  const { data, isLoading, isError, isFetching, refetch } =
    useKillsControllerGetUserNpcKills(npcKillsParams, {
      query: {
        queryKey: getKillsControllerGetUserNpcKillsQueryKey(npcKillsParams),
        staleTime: 30_000,
      },
    });

  const handleWorldChange = (world: string | undefined) => {
    setQuery({ world: world ?? null, cursor: null });
  };

  const handleNpcTypeChange = (npcTypes: NpcType[] | undefined) => {
    setQuery({ npcType: npcTypes ?? null, cursor: null });
  };

  const handleDraftChange = (key: keyof KillsDrafts, value: string) => {
    const nextDrafts = { ...drafts, [key]: value };

    setDrafts(nextDrafts);
    publishQuery({ ...nextDrafts, cursor: null });
  };

  const handleResetFilters = () => {
    publishQuery.cancel();
    setDrafts({ search: "", minLvl: "", maxLvl: "" });
    setQuery({
      world: null,
      npcType: null,
      search: null,
      minLvl: null,
      maxLvl: null,
      period: null,
      cursor: null,
    });
  };

  const handlePeriodChange = (period: KillStatsPeriod) => {
    setQuery({ period, cursor: null });
  };

  const handleNextPage = () => {
    if (data?.pagination.hasNext) {
      setQuery({ cursor: cursor + ITEMS_PER_PAGE });
    }
  };

  const handlePreviousPage = () => {
    if (cursor > 0) {
      setQuery({ cursor: Math.max(0, cursor - ITEMS_PER_PAGE) });
    }
  };

  const columns = createKillsColumns(cursor);

  const table = useTable({
    features: sortingTableFeatures,
    data: data?.npcs || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    manualSorting: true,
  });

  const hasPrev = cursor > 0;
  const hasActiveFilters = hasKillsFilters(filters);

  const renderResults = () => {
    if (isLoading) {
      return <TableRowsSkeleton trailingColumns={2} />;
    }

    if (isError && !data) {
      return (
        <EmptyState
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
      );
    }

    if (!data || data.npcs.length === 0) {
      return (
        <EmptyState
          icon={SearchX}
          title={t(
            hasActiveFilters
              ? "kills.ranking.filteredNoData"
              : "kills.ranking.noData",
          )}
          action={
            hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                <FilterX data-icon="inline-start" aria-hidden />
                {t("statistics.clearFilters")}
              </Button>
            )
          }
        />
      );
    }

    if (isMobile) {
      return <KillsMobileList npcs={data.npcs} startRank={cursor} />;
    }

    return (
      <Table className="border-b">
        <TanStackTableHeader
          table={table}
          className="sticky top-0 z-10 bg-background"
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

  const totalKills = data?.pagination?.total ?? 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3">
      <PageHeader
        icon={Skull}
        title={t("kills.ranking.title")}
        description={t("kills.ranking.description")}
      />
      <KillsFilters
        filters={{
          ...filters,
          search: drafts.search,
          minLvl: drafts.minLvl ? Number(drafts.minLvl) : undefined,
          maxLvl: drafts.maxLvl ? Number(drafts.maxLvl) : undefined,
        }}
        onWorldChange={handleWorldChange}
        onNpcTypeChange={handleNpcTypeChange}
        onSearchChange={(search) => handleDraftChange("search", search)}
        onMinLvlChange={(minLvl) => handleDraftChange("minLvl", minLvl)}
        onMaxLvlChange={(maxLvl) => handleDraftChange("maxLvl", maxLvl)}
        onPeriodChange={handlePeriodChange}
      />
      <ResultsSurface
        withHorizontalScroll={!isMobile}
        footer={
          <TablePaginationFooter
            totalLabel={t("kills.ranking.total", { count: totalKills })}
            hasPrev={hasPrev}
            hasNext={Boolean(data?.pagination?.hasNext)}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
          />
        }
      >
        {renderResults()}
      </ResultsSurface>
    </div>
  );
};
