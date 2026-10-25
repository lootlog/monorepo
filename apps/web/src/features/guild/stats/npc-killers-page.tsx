import { countActiveKillStatsFilters } from "@/features/kills/components/count-active-kill-stats-filters";
import { formatLevel } from "@lootlog/domain/profession";
import { EmptyState } from "@/components/common/empty-state";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { Ghost } from "lucide-react";
import {
  KillStatsFilters,
  type KillStatsFiltersProps,
} from "@/features/kills/components/kill-stats-filters";
import { KillStatsSearch } from "@/features/kills/components/kill-stats-search";
import { KillStatsStackedFilters } from "@/features/kills/components/kill-stats-stacked-filters";
import { MemberNameWithColor } from "./components/member-name-with-color";
import { StatsCountCell } from "@/components/common/stats-count-cell";
import { StatsDetailMeta } from "./components/stats-detail-meta";
import { MemberAvatar } from "@/components/common/member-avatar";
import { RankBadge } from "@/components/common/rank-badge";
import {
  STATS_TABLE_COUNT_COLUMN_ID,
  STATS_TABLE_POSITION_COLUMN_ID,
  StatsTable,
} from "@/components/common/stats-table";
import { StatsTableResults } from "./components/stats-table-results";
import { DetailPage } from "@/components/common/detail-page";
import { ResultsSurface } from "@/components/common/results-surface";
import { StatsDetailPageSkeleton } from "./stats-detail-page-skeleton";
import { useNpcKillersPage } from "./use-npc-killers-page";
import { useIsViewer } from "@/hooks/auth/use-is-viewer";

export const NpcKillersPage = () => {
  const {
    isLoading,
    data,
    t,
    killers,
    search,
    handleSearchChange,
    settings,
    handlePeriodChange,
    hasActiveFilters,
    paginatedKillers,
    cursor,
    guildId,
    membersMap,
    total,
    hasPrev,
    hasNext,
    handlePreviousPage,
    handleNextPage,
  } = useNpcKillersPage();

  const isViewer = useIsViewer();

  const columns: ColumnDef<
    typeof coreTableFeatures,
    (typeof paginatedKillers)[number]
  >[] = [
    {
      id: STATS_TABLE_POSITION_COLUMN_ID,
      header: () => t("kills.memberRanking.position"),
      cell: ({ row }) => <RankBadge rank={cursor + row.index + 1} />,
    },
    {
      id: "member",
      header: () => t("kills.npcKillers.member"),
      cell: ({ row: { original: killer } }) => (
        <div className="flex min-w-0 items-center gap-2.5">
          <MemberAvatar
            userId={killer.memberUserId}
            avatar={killer.memberAvatar}
            name={killer.memberName}
            className="size-7"
          />
          <TextLink
            className="min-w-0 truncate text-sm"
            render=<Link
              to="/$guildId/stats/members/$memberId"
              params={{
                guildId,
                memberId: String(killer.memberId),
              }}
            />
          >
            <MemberNameWithColor
              name={killer.memberName}
              member={membersMap.get(killer.memberUserId)}
            />
          </TextLink>
        </div>
      ),
    },
    {
      id: STATS_TABLE_COUNT_COLUMN_ID,
      header: () => t("kills.npcKillers.killCount"),
      cell: ({ row: { original: killer } }) => (
        <StatsCountCell value={killer.participationCount} emphasized />
      ),
    },
  ];

  const filterProps: KillStatsFiltersProps = {
    period: settings.period,
    onPeriodChange: handlePeriodChange,
  };

  const table = useTable({
    features: coreTableFeatures,
    data: paginatedKillers,
    columns,
    getRowId: (killer) => String(killer.memberId),
  });

  if (isLoading) {
    return <StatsDetailPageSkeleton rowContent="text" />;
  }

  const npc = data?.npc;

  if (!npc) {
    return (
      <EmptyState
        icon={Ghost}
        title={t("kills.npcKillers.notFound")}
        className="h-full"
      />
    );
  }

  return (
    <DetailPage
      name={npc.npcName}
      meta={
        <StatsDetailMeta
          subtitle={`${t(`npcType.${npc.npcType}`)} · ${t("kills.level", { level: formatLevel(npc.npcLvl, npc.npcProf) })}`}
          metrics={[
            {
              key: "kills",
              label: t("kills.npcKillers.uniqueGuildKills"),
              value: npc.uniqueGuildKills,
            },
            {
              key: "members",
              label: t("kills.npcKillers.totalMembers"),
              value: killers.length,
            },
          ]}
        />
      }
    >
      <ResultsSurface
        search={
          <KillStatsSearch
            value={search}
            placeholder={t("kills.npcKillers.searchPlaceholder")}
            onChange={handleSearchChange}
          />
        }
        filters={<KillStatsFilters {...filterProps} />}
        stackedFilters={<KillStatsStackedFilters {...filterProps} />}
        activeFilterCount={countActiveKillStatsFilters(filterProps)}
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
          isLoading={false}
          emptyMessage={
            paginatedKillers.length === 0
              ? t(
                  hasActiveFilters
                    ? "kills.npcKillers.filteredNoData"
                    : "kills.npcKillers.noKillers",
                )
              : undefined
          }
        >
          <StatsTable
            table={table}
            className="border-b"
            isViewerRow={(killer) => isViewer(killer.memberUserId)}
          />
        </StatsTableResults>
      </ResultsSurface>
    </DetailPage>
  );
};
