import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { KillStatsFilterBar } from "./components/kill-stats-filter-bar";
import { MemberNameWithColor } from "./components/member-name-with-color";
import { StatsCountCell } from "./components/stats-count-cell";
import { StatsMemberAvatar } from "./components/stats-member-avatar";
import { StatsRank } from "./components/stats-rank";
import {
  STATS_TABLE_COUNT_COLUMN_ID,
  STATS_TABLE_POSITION_COLUMN_ID,
  StatsTable,
} from "./components/stats-table";
import { StatsTableCard } from "./components/stats-table-card";
import { useStatsRankingModel } from "./use-stats-ranking-model";

export const StatsRanking = () => {
  const {
    t,
    handleSearchChange,
    settings,
    handleWorldChange,
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
    membersMap,
    total,
    hasPrev,
    hasNext,
    handlePreviousPage,
    handleNextPage,
  } = useStatsRankingModel();

  type RankingColumn = ColumnDef<
    typeof coreTableFeatures,
    (typeof paginatedData)[number]
  >;

  const columns: RankingColumn[] = [
    {
      id: STATS_TABLE_POSITION_COLUMN_ID,
      header: () => t("kills.memberRanking.position"),
      cell: ({ row }) => <StatsRank rank={cursor + row.index + 1} />,
    },
    {
      id: "member",
      header: () => t("kills.memberRanking.member"),
      cell: ({ row: { original: member } }) => (
        <div className="flex items-center gap-2.5">
          <StatsMemberAvatar
            userId={member.memberUserId}
            avatar={member.memberAvatar}
            name={member.memberName}
            className="size-7"
          />
          <TextLink
            className="text-sm"
            onClick={(event) => event.stopPropagation()}
            render=<Link
              to="/$guildId/stats/members/$memberId"
              params={{
                guildId,
                memberId: String(member.memberId),
              }}
            />
          >
            <MemberNameWithColor
              name={member.memberName}
              member={membersMap.get(member.memberUserId)}
            />
          </TextLink>
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

  const table = useTable({
    features: coreTableFeatures,
    data: paginatedData,
    columns,
    getRowId: (member) => String(member.memberId),
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 px-3 pb-3">
      <h1 className="sr-only">{t("kills.fullRanking.title")}</h1>
      <KillStatsFilterBar
        world={settings.world}
        period={settings.period}
        onWorldChange={handleWorldChange}
        onPeriodChange={handlePeriodChange}
        search={{
          placeholder: t("kills.fullRanking.searchPlaceholder"),
          onChange: handleSearchChange,
        }}
        level={{
          minLvl: settings.minLvl,
          maxLvl: settings.maxLvl,
          onMinLvlChange: handleMinLvlChange,
          onMaxLvlChange: handleMaxLvlChange,
        }}
      />

      <StatsTableCard
        isLoading={isLoading}
        emptyMessage={
          paginatedData.length === 0
            ? t(
                hasActiveFilters
                  ? "kills.memberRanking.filteredNoData"
                  : "kills.memberRanking.noData",
              )
            : undefined
        }
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
        <ul className="md:hidden">
          {paginatedData.map((member, index) => (
            <li
              key={member.memberId}
              className="border-b border-border last:border-b-0"
            >
              <Link
                to="/$guildId/stats/members/$memberId"
                params={{ guildId, memberId: String(member.memberId) }}
                className="block p-3 outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <StatsRank rank={cursor + index + 1} />
                  <StatsMemberAvatar
                    userId={member.memberUserId}
                    avatar={member.memberAvatar}
                    name={member.memberName}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <MemberNameWithColor
                      name={member.memberName}
                      member={membersMap.get(member.memberUserId)}
                    />
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {member.totalParticipations.toLocaleString("pl-PL")}
                  </span>
                </span>
                {activeNpcTypes.length > 0 && (
                  <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 pl-9 text-xs text-muted-foreground">
                    {activeNpcTypes.map((type) => (
                      <span key={type}>
                        {t(`npcType.${type}`)}{" "}
                        <span className="font-medium tabular-nums text-foreground">
                          {(
                            member.participationsByType[type] ?? 0
                          ).toLocaleString("pl-PL")}
                        </span>
                      </span>
                    ))}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
        <StatsTable
          table={table}
          className="hidden border-b md:table"
          onRowClick={(member) => handleRowClick(member.memberId)}
        />
      </StatsTableCard>
    </div>
  );
};
