import { EmptyState } from "@/components/common/empty-state";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import type {
  MemberKillsResponseDtoOutput,
  NpcType,
} from "@lootlog/client/main";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
} from "@lootlog/ui/components/table";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { UserX } from "lucide-react";
import { KillStatsFilterBar } from "./components/kill-stats-filter-bar";
import { StatsCountCell } from "./components/stats-count-cell";
import { StatsDetailHeader } from "./components/stats-detail-header";
import { StatsMemberAvatar } from "./components/stats-member-avatar";
import { StatsNpcCell } from "./components/stats-npc-cell";
import { StatsRank } from "./components/stats-rank";
import { StatsTableCard } from "./components/stats-table-card";
import { StatsTableHeader } from "./components/stats-table-header";
import { StatsTableRow } from "./components/stats-table-row";
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

  const { npcs, total, hasNext, totalParticipations } =
    getMemberStatsResponseView(data);

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
        <Table className="border-b">
          <StatsTableHeader>
            <TableHead className="w-14 text-center">
              {t("kills.memberRanking.position")}
            </TableHead>
            <TableHead>{t("kills.memberStats.npc")}</TableHead>
            <TableHead className="text-right">
              {t("kills.memberStats.killCount")}
            </TableHead>
          </StatsTableHeader>
          <TableBody>
            {npcs.map((npc, index) => (
              <StatsTableRow key={npc.npcId}>
                <TableCell className="text-center">
                  <StatsRank rank={cursor + index + 1} />
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell>
                  <StatsCountCell value={npc.totalKills} emphasized />
                </TableCell>
              </StatsTableRow>
            ))}
          </TableBody>
        </Table>
      </StatsTableCard>
    </div>
  );
};
