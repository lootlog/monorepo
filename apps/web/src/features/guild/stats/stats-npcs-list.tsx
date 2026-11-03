import { countActiveKillStatsFilters } from "@/features/kills/components/count-active-kill-stats-filters";
import { cn } from "cn";
import { formatLevel } from "@lootlog/domain/profession";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import {
  KillStatsFilters,
  type KillStatsFiltersProps,
} from "@/features/kills/components/kill-stats-filters";
import { KillStatsSearch } from "@/features/kills/components/kill-stats-search";
import { KillStatsStackedFilters } from "@/features/kills/components/kill-stats-stacked-filters";
import { TRACKABLE_NPC_TYPES } from "./constants";
import { StatsCountCell } from "@/components/common/stats-count-cell";
import { StatsMobileListSkeleton } from "./components/stats-mobile-list-skeleton";
import { StatsNpcCell } from "@/components/common/stats-npc-cell";
import { RankBadge } from "@/components/common/rank-badge";
import {
  STATS_TABLE_COUNT_COLUMN_ID,
  STATS_TABLE_POSITION_COLUMN_ID,
  STATS_TABLE_TYPE_COLUMN_ID,
  StatsTable,
} from "@/components/common/stats-table";
import { StatsTableResults } from "./components/stats-table-results";
import { ResultsSurface } from "@/components/common/results-surface";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { useStatsNpcsListModel } from "./use-stats-npcs-list-model";
import { formatNumber } from "@/lib/format-number";

export const StatsNpcsList = () => {
  const {
    t,
    search,
    handleSearchChange,
    settings,
    handleNpcTypeChange,
    handleMinLvlChange,
    handleMaxLvlChange,
    handlePeriodChange,
    isLoading,
    paginatedData,
    hasActiveFilters,
    handleRowClick,
    cursor,
    guildId,
    total,
    isCapped,
    hasPrev,
    hasNext,
    handlePreviousPage,
    handleNextPage,
    handleClearFilters,
  } = useStatsNpcsListModel();

  const columns: ColumnDef<
    typeof coreTableFeatures,
    (typeof paginatedData)[number]
  >[] = [
    {
      id: STATS_TABLE_POSITION_COLUMN_ID,
      header: () => t("kills.memberRanking.position"),
      cell: ({ row }) => <RankBadge rank={cursor + row.index + 1} />,
    },
    {
      id: "npc",
      header: () => t("kills.npcsList.npc"),
      cell: ({ row: { original: npc } }) => (
        <StatsNpcCell
          npc={{
            id: npc.npcId,
            name: npc.npcName,
            lvl: npc.npcLvl,
            icon: npc.npcIcon,
          }}
          name={
            <TextLink
              onClick={(event) => event.stopPropagation()}
              render=<Link
                to="/$guildId/stats/npcs/$npcId"
                params={{ guildId, npcId: String(npc.npcId) }}
              />
            >
              {npc.npcName}
            </TextLink>
          }
          subtitle={t("kills.level", { level: formatLevel(npc.npcLvl) })}
        />
      ),
    },
    {
      id: STATS_TABLE_TYPE_COLUMN_ID,
      header: () => t("kills.npcsList.type"),
      cell: ({ row: { original: npc } }) => t(`npcType.${npc.npcType}`),
    },
    {
      id: STATS_TABLE_COUNT_COLUMN_ID,
      header: () => t("kills.npcKillers.killCount"),
      cell: ({ row: { original: npc } }) => (
        <StatsCountCell value={npc.uniqueKills} emphasized />
      ),
    },
  ];

  const filterProps: KillStatsFiltersProps = {
    period: settings.period,
    onPeriodChange: handlePeriodChange,
    level: {
      minLvl: settings.minLvl,
      maxLvl: settings.maxLvl,
      onMinLvlChange: handleMinLvlChange,
      onMaxLvlChange: handleMaxLvlChange,
    },
    npcType: {
      types: TRACKABLE_NPC_TYPES,
      // "ALL" is the stored default, not a narrowing filter.
      value: settings.npcType === "ALL" ? undefined : settings.npcType,
      onValueChange: handleNpcTypeChange,
    },
  };

  const table = useTable({
    features: coreTableFeatures,
    data: paginatedData,
    columns,
    getRowId: (npc) => String(npc.npcId),
  });

  return (
    <>
      <h1 className="sr-only">{t("kills.npcsList.title")}</h1>
      <ResultsSurface
        search={
          <KillStatsSearch
            value={search}
            placeholder={t("kills.npcsList.searchPlaceholder")}
            onChange={handleSearchChange}
          />
        }
        filters={<KillStatsFilters {...filterProps} />}
        stackedFilters={<KillStatsStackedFilters {...filterProps} />}
        activeFilterCount={countActiveKillStatsFilters(filterProps)}
        clearFiltersLabel={t("kills.filters.clear")}
        onClearFilters={handleClearFilters}
        filtersLabel={t("kills.filters.title")}
        scrollResetKey={cursor}
        footer={
          <TablePaginationFooter
            totalLabel={
              isCapped
                ? t("kills.npcsList.totalTop", { limit: total })
                : t("kills.npcsList.total", { count: total })
            }
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
          />
        }
      >
        <StatsTableResults
          isLoading={isLoading}
          mobileSkeleton={<StatsMobileListSkeleton media="npcTile" />}
          emptyMessage={
            paginatedData.length === 0
              ? t(
                  hasActiveFilters
                    ? "kills.topNpcs.filteredNoData"
                    : "kills.topNpcs.noData",
                )
              : undefined
          }
        >
          <ul className="xl:hidden">
            {paginatedData.map((npc, index) => (
              <li
                key={npc.npcId}
                data-list-tile
                className={LIST_TILE_RULE_CLASS}
              >
                <Link
                  to="/$guildId/stats/npcs/$npcId"
                  params={{ guildId, npcId: String(npc.npcId) }}
                  className={cn(
                    "flex min-w-0 items-center gap-3 py-3 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                    LIST_TILE_INSET_CLASS,
                  )}
                >
                  <RankBadge rank={cursor + index + 1} />
                  <span className="min-w-0 flex-1">
                    <StatsNpcCell
                      npc={{
                        id: npc.npcId,
                        name: npc.npcName,
                        lvl: npc.npcLvl,
                        icon: npc.npcIcon,
                      }}
                      name={npc.npcName}
                      subtitle={`${t(`npcType.${npc.npcType}`)} · ${t("kills.level", { level: formatLevel(npc.npcLvl) })}`}
                    />
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatNumber(npc.uniqueKills)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <StatsTable
            table={table}
            className="hidden border-b xl:table"
            onRowClick={handleRowClick}
          />
        </StatsTableResults>
      </ResultsSurface>
    </>
  );
};
