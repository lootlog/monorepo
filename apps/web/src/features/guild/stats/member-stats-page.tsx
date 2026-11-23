import { countActiveKillStatsFilters } from "@/features/kills/components/count-active-kill-stats-filters";
import { formatLevel } from "@lootlog/domain/profession";
import { DetailNotFound } from "@/components/common/detail-not-found";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import type { MemberKillsResponseDtoOutput } from "@lootlog/client/main";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { Skull, UserX } from "lucide-react";
import { cn } from "cn";
import { formatNumber } from "@lootlog/domain/locale";
import { ROUTES } from "@/config/routes";
import {
  LIST_TILE_HOVER_CLASS,
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { StatsMobileListSkeleton } from "./components/stats-mobile-list-skeleton";
import {
  KillStatsFilters,
  type KillStatsFiltersProps,
} from "@/features/kills/components/kill-stats-filters";
import { KillStatsSearch } from "@/components/common/kill-stats-search";
import { KillStatsStackedFilters } from "@/features/kills/components/kill-stats-stacked-filters";
import {
  NPC_TYPES_STRONGEST_FIRST,
  TRACKABLE_NPC_TYPES,
} from "@lootlog/domain/npc-type";
import { StatsCountCell } from "@/components/common/stats-count-cell";
import { StatsDetailMeta } from "./components/stats-detail-meta";
import { MemberIdentity } from "@/components/common/member-identity";
import { getDiscordAvatarUrl } from "@lootlog/domain/discord-avatar";
import { StatsNpcCell } from "@/components/common/stats-npc-cell";
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
import { useMemberStatsPage } from "./use-member-stats-page";

const getMemberStatsResponseView = (
  data: MemberKillsResponseDtoOutput | undefined,
) => ({
  npcs: data?.npcs ?? [],
  total: data?.total ?? 0,
  hasNext: Boolean(data?.nextCursor),
  totalParticipations: data?.overview?.totalParticipations ?? 0,
});

export const MemberStatsPage = () => {
  const {
    member,
    isLoading,
    t,
    data,
    settings,
    hasActiveFilters,
    firstRank,
    hasPrev,
    memberColor,
    search,
    handleSearchChange,
    handleNpcTypeChange,
    handleMinLvlChange,
    handleMaxLvlChange,
    handlePeriodChange,
    guildId,
    handlePreviousPage,
    handleNextPage,
    handleClearFilters,
  } = useMemberStatsPage();

  const { npcs, total, hasNext, totalParticipations } =
    getMemberStatsResponseView(data);

  const columns: ColumnDef<typeof coreTableFeatures, (typeof npcs)[number]>[] =
    [
      {
        id: STATS_TABLE_POSITION_COLUMN_ID,
        header: () => t("kills.memberRanking.position"),
        cell: ({ row }) => <RankBadge rank={firstRank + row.index + 1} />,
      },
      {
        id: "npc",
        header: () => t("kills.memberStats.npc"),
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
                render=<Link
                  to="/$guildId/stats/npcs/$npcId"
                  params={{ guildId, npcId: String(npc.npcId) }}
                />
              >
                {npc.npcName}
              </TextLink>
            }
            subtitle={`${t(`npcType.${npc.npcType}`)} · ${t("kills.level", { level: formatLevel(npc.npcLvl, npc.npcProf) })}`}
          />
        ),
      },
      {
        id: STATS_TABLE_COUNT_COLUMN_ID,
        header: () => t("kills.memberStats.killCount"),
        cell: ({ row: { original: npc } }) => (
          <StatsCountCell value={npc.totalKills} emphasized />
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
      value: settings.npcType === "ALL" ? undefined : settings.npcType,
      onValueChange: handleNpcTypeChange,
    },
  };

  const table = useTable({
    features: coreTableFeatures,
    data: npcs,
    columns,
    getRowId: (npc) => String(npc.npcId),
  });

  if (!member) {
    if (isLoading) {
      return (
        <StatsDetailPageSkeleton
          mobileSkeleton={<StatsMobileListSkeleton media="npcTile" />}
        />
      );
    }

    return (
      <DetailNotFound
        icon={UserX}
        title={t("kills.memberStats.notFound")}
        description={t("kills.memberStats.notFoundDescription")}
        backTo={ROUTES.guild.statsRanking(guildId)}
        backLabel={t("kills.memberStats.backToRanking")}
      />
    );
  }

  const overview = data?.overview;

  const typeMetrics = NPC_TYPES_STRONGEST_FIRST.flatMap((type) => {
    const value = overview?.participationsByType[type] ?? 0;

    return value > 0
      ? [{ key: type, label: t(`npcType.${type}`), value: formatNumber(value) }]
      : [];
  });

  return (
    <DetailPage
      name={member.name}
      nameStyle={{ color: memberColor }}
      media={
        <MemberIdentity
          member={{ memberId: member.id }}
          fallback={{
            name: member.name,
            avatarUrl: getDiscordAvatarUrl(member.userId, member.avatar, 64),
          }}
          display="avatar"
        />
      }
      meta={
        <StatsDetailMeta
          facts={[
            {
              key: "total",
              label: t("kills.memberStats.subtitle"),
              value: formatNumber(totalParticipations),
            },
            ...typeMetrics,
          ]}
        />
      }
    >
      <ResultsSurface
        search={
          <KillStatsSearch
            value={search}
            placeholder={t("kills.memberStats.searchPlaceholder")}
            onChange={handleSearchChange}
          />
        }
        filters={<KillStatsFilters {...filterProps} />}
        stackedFilters={<KillStatsStackedFilters {...filterProps} />}
        activeFilterCount={countActiveKillStatsFilters(filterProps)}
        clearFiltersLabel={t("kills.filters.clear")}
        onClearFilters={handleClearFilters}
        filtersLabel={t("kills.filters.title")}
        scrollResetKey={firstRank}
        footer={
          (hasPrev || npcs.length > 0) && (
            <TablePaginationFooter
              totalLabel={t("kills.npcsList.total", { count: total })}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
            />
          )
        }
      >
        <StatsTableResults
          isLoading={isLoading}
          mobileSkeleton={<StatsMobileListSkeleton media="npcTile" />}
          emptyState={
            npcs.length === 0
              ? hasActiveFilters
                ? {
                    isFiltered: true,
                    title: t("kills.memberStats.filteredNoData"),
                    description: t(
                      "kills.memberStats.filteredNoDataDescription",
                    ),
                    onClearFilters: handleClearFilters,
                  }
                : {
                    isFiltered: false,
                    icon: Skull,
                    title: t("kills.memberStats.noData"),
                  }
              : undefined
          }
          tiles={
            <ul>
              {npcs.map((npc, index) => (
                <li
                  key={npc.npcId}
                  data-list-tile
                  className={LIST_TILE_RULE_CLASS}
                >
                  <Link
                    to="/$guildId/stats/npcs/$npcId"
                    params={{ guildId, npcId: String(npc.npcId) }}
                    className={cn(
                      "flex min-w-0 items-center gap-3 py-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      LIST_TILE_HOVER_CLASS,
                      LIST_TILE_INSET_CLASS,
                    )}
                  >
                    <RankBadge rank={firstRank + index + 1} />
                    <span className="min-w-0 flex-1">
                      <StatsNpcCell
                        npc={{
                          id: npc.npcId,
                          name: npc.npcName,
                          lvl: npc.npcLvl,
                          icon: npc.npcIcon,
                        }}
                        name={npc.npcName}
                        subtitle={`${t(`npcType.${npc.npcType}`)} · ${t("kills.level", { level: formatLevel(npc.npcLvl, npc.npcProf) })}`}
                      />
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatNumber(npc.totalKills)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          }
        >
          <StatsTable table={table} className="border-b" />
        </StatsTableResults>
      </ResultsSurface>
    </DetailPage>
  );
};
