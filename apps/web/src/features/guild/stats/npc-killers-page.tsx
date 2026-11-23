import { countActiveKillStatsFilters } from "@/features/kills/components/count-active-kill-stats-filters";
import { formatLevel } from "@lootlog/domain/profession";
import { DetailNotFound } from "@/components/common/detail-not-found";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { Ghost, Users } from "lucide-react";
import { cn } from "cn";
import { formatNumber } from "@lootlog/domain/locale";
import { ROUTES } from "@/config/routes";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { VIEWER_ROW_CLASS } from "@/components/common/viewer-row";
import {
  KillStatsFilters,
  type KillStatsFiltersProps,
} from "@/features/kills/components/kill-stats-filters";
import { KillStatsSearch } from "@/components/common/kill-stats-search";
import { KillStatsStackedFilters } from "@/features/kills/components/kill-stats-stacked-filters";
import { MemberIdentity } from "@/components/common/member-identity";
import { StatsCountCell } from "@/components/common/stats-count-cell";
import { StatsDetailMeta } from "./components/stats-detail-meta";
import { getDiscordAvatarUrl } from "@lootlog/domain/discord-avatar";
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
import { StatsMobileListSkeleton } from "./components/stats-mobile-list-skeleton";
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
    total,
    isCapped,
    hasPrev,
    hasNext,
    handlePreviousPage,
    handleNextPage,
    handleClearFilters,
    guildId,
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
        <div className="flex min-w-0 items-center">
          <MemberIdentity
            member={{ memberId: killer.member.id }}
            fallback={{
              name: killer.member.name,
              avatarUrl: getDiscordAvatarUrl(
                killer.member.userId,
                killer.member.avatar,
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
    getRowId: (killer) => String(killer.member.id),
  });

  if (isLoading) {
    return (
      <StatsDetailPageSkeleton
        rowContent="text"
        mobileSkeleton={<StatsMobileListSkeleton media="avatar" />}
      />
    );
  }

  const npc = data?.npc;

  if (!npc) {
    return (
      <DetailNotFound
        icon={Ghost}
        title={t("kills.npcKillers.notFound")}
        description={t("kills.npcKillers.notFoundDescription")}
        backTo={ROUTES.guild.statsNpcs(guildId)}
        backLabel={t("kills.npcKillers.backToList")}
      />
    );
  }

  return (
    <DetailPage
      name={npc.npcName}
      meta={
        <StatsDetailMeta
          facts={[
            {
              key: "type",
              label: t("kills.columns.type"),
              value: t(`npcType.${npc.npcType}`),
            },
            {
              key: "level",
              label: t("kills.columns.level"),
              value: formatLevel(npc.npcLvl, npc.npcProf),
            },
            {
              key: "kills",
              label: t("kills.npcKillers.uniqueGuildKills"),
              value: formatNumber(npc.uniqueGuildKills),
            },
            {
              key: "members",
              label: t("kills.npcKillers.totalMembers"),
              value: `${formatNumber(killers.length)}${isCapped ? "+" : ""}`,
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
        clearFiltersLabel={t("kills.filters.clear")}
        onClearFilters={handleClearFilters}
        filtersLabel={t("kills.filters.title")}
        scrollResetKey={cursor}
        footer={
          <TablePaginationFooter
            totalLabel={
              isCapped && !settings.search
                ? t("kills.npcKillers.totalTop", { limit: total })
                : t("kills.fullRanking.total", { count: total })
            }
            hasPrev={hasPrev}
            hasNext={hasNext}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
          />
        }
      >
        <StatsTableResults
          isLoading={false}
          emptyState={
            paginatedKillers.length === 0
              ? hasActiveFilters
                ? {
                    isFiltered: true,
                    title: t("kills.npcKillers.filteredNoData"),
                    description: t(
                      "kills.npcKillers.filteredNoDataDescription",
                    ),
                    onClearFilters: handleClearFilters,
                  }
                : {
                    isFiltered: false,
                    icon: Users,
                    title: t("kills.npcKillers.noKillers"),
                  }
              : undefined
          }
          tiles={
            <ul>
              {paginatedKillers.map((killer, index) => (
                <li
                  key={killer.member.id}
                  data-list-tile
                  aria-current={isViewer(killer.member.userId) || undefined}
                  className={cn(
                    "flex min-w-0 items-center gap-3 py-3",
                    LIST_TILE_RULE_CLASS,
                    LIST_TILE_INSET_CLASS,
                    isViewer(killer.member.userId) && VIEWER_ROW_CLASS,
                  )}
                >
                  <RankBadge rank={cursor + index + 1} />
                  <span className="flex min-w-0 flex-1">
                    <MemberIdentity
                      member={{ memberId: killer.member.id }}
                      fallback={{
                        name: killer.member.name,
                        avatarUrl: getDiscordAvatarUrl(
                          killer.member.userId,
                          killer.member.avatar,
                          64,
                        ),
                      }}
                      className="gap-3"
                      avatarClassName="size-8"
                    />
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatNumber(killer.participationCount)}
                  </span>
                </li>
              ))}
            </ul>
          }
        >
          <StatsTable
            table={table}
            className="border-b"
            isViewerRow={(killer) => isViewer(killer.member.userId)}
          />
        </StatsTableResults>
      </ResultsSurface>
    </DetailPage>
  );
};
