import { EmptyState } from "@/components/common/empty-state";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { coreTableFeatures } from "@/lib/tanstack-table-features";
import type {
  MemberKillsResponseDtoOutput,
  NpcType,
} from "@lootlog/client/main";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { type ColumnDef, useTable } from "@tanstack/react-table";
import { UserX } from "lucide-react";
import { KillStatsFilterBar } from "./components/kill-stats-filter-bar";
import { StatsCountCell } from "./components/stats-count-cell";
import { StatsDetailHeader } from "./components/stats-detail-header";
import { StatsMemberAvatar } from "./components/stats-member-avatar";
import { StatsNpcCell } from "./components/stats-npc-cell";
import { StatsRank } from "./components/stats-rank";
import {
  STATS_TABLE_COUNT_COLUMN_ID,
  STATS_TABLE_POSITION_COLUMN_ID,
  StatsTable,
} from "./components/stats-table";
import { StatsTableCard } from "./components/stats-table-card";
import type { useStatsSettings } from "./hooks/use-stats-settings";
import { StatsDetailPageSkeleton } from "./stats-detail-page-skeleton";
import { useMemberStatsPage } from "./use-member-stats-page";

const NPC_TYPE_ORDER: NpcType[] = [
  "TITAN",
  "COLOSSUS",
  "HERO",
  "EVENT_HERO",
  "ELITE3",
  "ELITE2",
  "ELITE",
  "COMMON",
];

type StatsSettings = ReturnType<typeof useStatsSettings>["settings"];

const hasMemberStatsFilters = (
  settings: StatsSettings,
  debouncedSearch: string,
) =>
  Boolean(settings.world) ||
  Boolean(settings.minLvl) ||
  Boolean(settings.maxLvl) ||
  settings.period !== "all" ||
  settings.npcType !== "ALL" ||
  Boolean(debouncedSearch);

const getMemberStatsResponseView = (
  data: MemberKillsResponseDtoOutput | undefined,
) => ({
  npcs: data?.npcs ?? [],
  total: data?.pagination?.total ?? 0,
  hasNext: data?.pagination?.hasNext ?? false,
  totalParticipations: data?.overview?.totalParticipations ?? 0,
});

export const MemberStatsPage = () => {
  const {
    member,
    isLoading,
    t,
    data,
    settings,
    debouncedSearch,
    cursor,
    memberColor,
    search,
    handleSearchChange,
    handleWorldChange,
    handleNpcTypeChange,
    handleMinLvlChange,
    handleMaxLvlChange,
    handlePeriodChange,
    guildId,
    handlePreviousPage,
    handleNextPage,
  } = useMemberStatsPage();

  const { npcs, total, hasNext, totalParticipations } =
    getMemberStatsResponseView(data);

  const columns: ColumnDef<typeof coreTableFeatures, (typeof npcs)[number]>[] =
    [
      {
        id: STATS_TABLE_POSITION_COLUMN_ID,
        header: () => t("kills.memberRanking.position"),
        cell: ({ row }) => <StatsRank rank={cursor + row.index + 1} />,
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
            subtitle={`${t(`npcType.${npc.npcType}`)} · ${npc.npcLvl}${npc.npcProf ?? ""}`}
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

  const table = useTable({
    features: coreTableFeatures,
    data: npcs,
    columns,
    getRowId: (npc) => String(npc.npcId),
  });

  if (!member) {
    if (isLoading) {
      return <StatsDetailPageSkeleton />;
    }

    return (
      <EmptyState
        icon={UserX}
        title={t("kills.memberStats.notFound")}
        className="h-full"
      />
    );
  }

  const overview = data?.overview;
  const hasActiveFilters = hasMemberStatsFilters(settings, debouncedSearch);

  const hasPrev = cursor > 0;

  const typeMetrics = NPC_TYPE_ORDER.flatMap((type) => {
    const value = overview?.participationsByType[type] ?? 0;

    return value > 0 ? [{ key: type, label: t(`npcType.${type}`), value }] : [];
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 bg-background p-3">
      <StatsDetailHeader
        media={
          <StatsMemberAvatar
            userId={member.memberUserId}
            avatar={member.memberAvatar}
            name={member.memberName}
            className="size-12"
            imageSize={128}
          />
        }
        title={<span style={{ color: memberColor }}>{member.memberName}</span>}
        subtitle={t("kills.memberStats.subtitle")}
        metrics={[
          {
            key: "total",
            label: t("kills.memberRanking.totalKills"),
            value: totalParticipations,
          },
          ...typeMetrics,
        ]}
      />

      <KillStatsFilterBar
        world={settings.world}
        period={settings.period}
        onWorldChange={handleWorldChange}
        onPeriodChange={handlePeriodChange}
        search={{
          value: search,
          placeholder: t("kills.memberStats.searchPlaceholder"),
          onChange: handleSearchChange,
        }}
        level={{
          minLvl: settings.minLvl,
          maxLvl: settings.maxLvl,
          onMinLvlChange: handleMinLvlChange,
          onMaxLvlChange: handleMaxLvlChange,
        }}
        npcType={{
          value: settings.npcType,
          onValueChange: handleNpcTypeChange,
        }}
      />

      <StatsTableCard
        isLoading={isLoading}
        emptyMessage={
          npcs.length === 0
            ? t(
                hasActiveFilters
                  ? "kills.memberStats.filteredNoData"
                  : "kills.memberStats.noData",
              )
            : undefined
        }
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
        <StatsTable table={table} className="border-b" />
      </StatsTableCard>
    </div>
  );
};
