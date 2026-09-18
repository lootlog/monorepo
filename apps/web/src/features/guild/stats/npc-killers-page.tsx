import { EmptyState } from "@/components/common/empty-state";
import { NpcTile } from "@/components/tiles/npc-tile";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
} from "@lootlog/ui/components/table";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { Ghost } from "lucide-react";
import { KillStatsFilterBar } from "./components/kill-stats-filter-bar";
import { MemberNameWithColor } from "./components/member-name-with-color";
import { StatsCountCell } from "./components/stats-count-cell";
import { StatsDetailHeader } from "./components/stats-detail-header";
import { StatsMemberAvatar } from "./components/stats-member-avatar";
import { StatsRank } from "./components/stats-rank";
import { StatsTableCard } from "./components/stats-table-card";
import { StatsTableHeader } from "./components/stats-table-header";
import { StatsTableRow } from "./components/stats-table-row";
import { StatsDetailPageSkeleton } from "./stats-detail-page-skeleton";
import { useNpcKillersPage } from "./use-npc-killers-page";

export const NpcKillersPage = () => {
  const {
    isLoading,
    data,
    t,
    killers,
    search,
    handleSearchChange,
    settings,
    handleWorldChange,
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

  if (isLoading) {
    return <StatsDetailPageSkeleton />;
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
    <div className="flex h-full min-h-0 flex-col gap-3 bg-background p-3">
      <StatsDetailHeader
        media={
          npc.npcIcon && (
            <span className="w-12 shrink-0">
              <NpcTile
                npc={{
                  id: npc.npcId,
                  name: npc.npcName,
                  lvl: npc.npcLvl,
                  icon: npc.npcIcon,
                }}
              />
            </span>
          )
        }
        title={npc.npcName}
        subtitle={`${t(`npcType.${npc.npcType}`)} · ${npc.npcLvl}${npc.npcProf ?? ""}`}
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

      <KillStatsFilterBar
        world={settings.world}
        period={settings.period}
        onWorldChange={handleWorldChange}
        onPeriodChange={handlePeriodChange}
        search={{
          value: search,
          placeholder: t("kills.npcKillers.searchPlaceholder"),
          onChange: handleSearchChange,
        }}
      />

      <StatsTableCard
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
        <Table className="border-b">
          <StatsTableHeader>
            <TableHead className="w-14 text-center">
              {t("kills.memberRanking.position")}
            </TableHead>
            <TableHead>{t("kills.npcKillers.member")}</TableHead>
            <TableHead className="text-right">
              {t("kills.npcKillers.killCount")}
            </TableHead>
          </StatsTableHeader>
          <TableBody>
            {paginatedKillers.map((killer, index) => (
              <StatsTableRow key={killer.memberId}>
                <TableCell className="text-center">
                  <StatsRank rank={cursor + index + 1} />
                </TableCell>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <StatsMemberAvatar
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
                </TableCell>
                <TableCell>
                  <StatsCountCell
                    value={killer.participationCount}
                    emphasized
                  />
                </TableCell>
              </StatsTableRow>
            ))}
          </TableBody>
        </Table>
      </StatsTableCard>
    </div>
  );
};
