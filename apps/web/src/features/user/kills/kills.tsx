import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
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
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Skull } from "lucide-react";
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

  const { data, isLoading } = useKillsControllerGetUserNpcKills(
    npcKillsParams,
    {
      query: {
        queryKey: getKillsControllerGetUserNpcKillsQueryKey(npcKillsParams),
        staleTime: 30_000,
      },
    },
  );

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

    if (!data || data.npcs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 p-16 h-full">
          <p className="text-muted-foreground">
            {t(
              hasActiveFilters
                ? "kills.ranking.filteredNoData"
                : "kills.ranking.noData",
            )}
          </p>
        </div>
      );
    }

    if (isMobile) {
      return <KillsMobileList npcs={data.npcs} startRank={cursor} />;
    }

    return (
      <Table className="border-b">
        <TanStackTableHeader
          table={table}
          className="bg-background sticky top-0 z-10"
          rowClassName="border-b-1! border-border"
          headClassName="whitespace-nowrap"
        />
        <TanStackTableBody
          table={table}
          rowClassName="bg-background border-b border-border h-14"
          cellClassName="whitespace-nowrap"
        />
      </Table>
    );
  };

  const totalKills = data?.pagination?.total ?? 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <PageHeader
            icon={Skull}
            title={t("kills.ranking.title")}
            description={t("kills.ranking.description")}
          >
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
          </PageHeader>

          <SectionCard className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <SectionCardHeader
              title={t("kills.ranking.total", {
                count: totalKills,
              })}
            />
            <ScrollArea className="relative flex-1 min-h-0 w-full">
              {renderResults()}
            </ScrollArea>
            <TablePaginationFooter
              totalLabel={t("kills.ranking.total", {
                count: totalKills,
              })}
              hasPrev={hasPrev}
              hasNext={Boolean(data?.pagination?.hasNext)}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
            />
          </SectionCard>
        </div>
      </ScrollArea>
    </div>
  );
};
