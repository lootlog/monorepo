import { countActiveKillStatsFilters } from "@/features/kills/components/count-active-kill-stats-filters";
import { cn } from "cn";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { Link } from "@tanstack/react-router";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import {
  KillStatsFilters,
  type KillStatsFiltersProps,
} from "@/features/kills/components/kill-stats-filters";
import { KillStatsSearch } from "@/components/common/kill-stats-search";
import { KillStatsStackedFilters } from "@/features/kills/components/kill-stats-stacked-filters";
import { MemberIdentity } from "@/components/common/member-identity";
import { StatsCountCell } from "@/components/common/stats-count-cell";
import { getDiscordAvatarUrl } from "@lootlog/domain/discord-avatar";
import { useId } from "react";
import { Users } from "lucide-react";
import { StatsMobileListSkeleton } from "./components/stats-mobile-list-skeleton";
import { RankBadge } from "@/components/common/rank-badge";
import {
  STATS_TABLE_COUNT_COLUMN_ID,
  STATS_TABLE_POSITION_COLUMN_ID,
  StatsTable,
} from "@/components/common/stats-table";
import { StatsTableResults } from "./components/stats-table-results";
import { ResultsSurface } from "@/components/common/results-surface";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
  LIST_TILE_HOVER_CLASS,
} from "@lootlog/ui/lib/list-tile";
import { useStatsRankingModel } from "./use-stats-ranking-model";
import { VIEWER_ROW_CLASS } from "@/components/common/viewer-row";
import { useIsViewer } from "@/hooks/auth/use-is-viewer";
import { formatNumber } from "@lootlog/domain/locale";

export const StatsRanking = () => {
  const {
    t,
    handleSearchChange,
    settings,
    handleMinLvlChange,
    handleMaxLvlChange,
    handlePeriodChange,
    isLoading,
    paginatedData,
    hasActiveFilters,
    cursor,
    handleRowClick,
    activeNpcTypes,
    guildId,
    total,
    hasPrev,
    hasNext,
    handlePreviousPage,
    handleNextPage,
    handleClearFilters,
    search,
  } = useStatsRankingModel();

  const isViewer = useIsViewer();
  const tileId = useId();

  type RankingColumn = ColumnDef<
    typeof coreTableFeatures,
    (typeof paginatedData)[number]
  >;

  const columns: RankingColumn[] = [
    {
      id: STATS_TABLE_POSITION_COLUMN_ID,
      header: () => t("kills.memberRanking.position"),
      cell: ({ row }) => <RankBadge rank={cursor + row.index + 1} />,
    },
    {
      id: "member",
      header: () => t("kills.memberRanking.member"),
      cell: ({ row: { original: member } }) => (
        <div className="flex min-w-0 items-center">
          <MemberIdentity
            member={{ memberId: member.member.id }}
            fallback={{
              name: member.member.name,
              avatarUrl: getDiscordAvatarUrl(
                member.member.userId,
                member.member.avatar,
                64,
              ),
            }}
            className="gap-2.5"
            avatarClassName="size-7"
          />
        </div>
      ),
    },
    {
      id: STATS_TABLE_COUNT_COLUMN_ID,
      header: () => t("kills.memberRanking.totalKills"),
      cell: ({ row: { original: member } }) => (
        <StatsCountCell value={member.totalParticipations} emphasized />
      ),
    },
    ...activeNpcTypes.map((type): RankingColumn => ({
      id: `${STATS_TABLE_COUNT_COLUMN_ID}:${type}`,
      header: () => t(`npcType.${type}`),
      cell: ({ row: { original: member } }) => (
        <StatsCountCell value={member.participationsByType[type] ?? 0} />
      ),
    })),
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
  };

  const table = useTable({
    features: coreTableFeatures,
    data: paginatedData,
    columns,
    getRowId: (member) => String(member.member.id),
  });

  return (
    <>
      <h1 className="sr-only">{t("kills.fullRanking.title")}</h1>
      <ResultsSurface
        search={
          <KillStatsSearch
            value={search}
            placeholder={t("kills.fullRanking.searchPlaceholder")}
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
            totalLabel={t("kills.fullRanking.total", { count: total })}
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
          />
        }
      >
        <StatsTableResults
          isLoading={isLoading}
          rowContent="text"
          mobileSkeleton={
            <StatsMobileListSkeleton media="avatar" withTypeCounts />
          }
          emptyState={
            paginatedData.length === 0
              ? hasActiveFilters
                ? {
                    isFiltered: true,
                    title: t("kills.memberRanking.filteredNoData"),
                    description: t(
                      "kills.memberRanking.filteredNoDataDescription",
                    ),
                    onClearFilters: handleClearFilters,
                  }
                : {
                    isFiltered: false,
                    icon: Users,
                    title: t("kills.memberRanking.noData"),
                  }
              : undefined
          }
          tiles={
            <ul>
              {paginatedData.map((member, index) => {
                const contentId = `${tileId}-${member.member.id}`;

                return (
                  <li
                    key={member.member.id}
                    data-list-tile
                    aria-current={isViewer(member.member.userId) || undefined}
                    className={cn(
                      "relative",
                      LIST_TILE_RULE_CLASS,
                      LIST_TILE_HOVER_CLASS,
                      isViewer(member.member.userId) && VIEWER_ROW_CLASS,
                    )}
                  >
                    <Link
                      to="/$guildId/stats/members/$memberId"
                      params={{ guildId, memberId: String(member.member.id) }}
                      aria-labelledby={contentId}
                      className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    />
                    <div
                      id={contentId}
                      className={cn(
                        "pointer-events-none relative py-3",
                        LIST_TILE_INSET_CLASS,
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <RankBadge rank={cursor + index + 1} />
                        <span className="flex min-w-0 flex-1">
                          <MemberIdentity
                            member={{ memberId: member.member.id }}
                            fallback={{
                              name: member.member.name,
                              avatarUrl: getDiscordAvatarUrl(
                                member.member.userId,
                                member.member.avatar,
                                64,
                              ),
                            }}
                            className="pointer-events-auto gap-3"
                            avatarClassName="size-8"
                          />
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatNumber(member.totalParticipations)}
                        </span>
                      </span>
                      {activeNpcTypes.length > 0 && (
                        <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pl-9 text-xs text-muted-foreground">
                          {activeNpcTypes.map((type) => (
                            <span key={type}>
                              {t(`npcType.${type}`)}{" "}
                              <span className="font-medium tabular-nums text-foreground">
                                {formatNumber(
                                  member.participationsByType[type] ?? 0,
                                )}
                              </span>
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          }
        >
          <StatsTable
            table={table}
            className="border-b"
            onRowClick={(member) => handleRowClick(member.member.id)}
            isViewerRow={(member) => isViewer(member.member.userId)}
          />
        </StatsTableResults>
      </ResultsSurface>
    </>
  );
};
