import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { PodiumRankIcon } from "@/components/ui/podium-rank-icon";
import { SearchInput } from "@/components/ui/search-input";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { StatsRankingRowsSkeleton } from "./components/stats-ranking-rows-skeleton";

import { WorldSwitcher } from "@/components/common/world-switcher";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";

import { KillStatsPeriodSelect } from "@/features/kills/components/kill-stats-period-select";
import { LevelFilters } from "./components/level-filters";
import { StatsRankingFiltersMobile } from "./components/stats-ranking-filters-mobile";

import { useStatsRankingModel } from "./use-stats-ranking-model";

export const StatsRanking: React.FC = () => {
  const {
    t,
    handleSearchChange,
    settings,
    handleWorldChange,
    handleMinLvlChange,
    handleMaxLvlChange,
    handlePeriodChange,
    isLoading,
    data,
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
  } = useStatsRankingModel();

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <PageHeader
            title={t("kills.fullRanking.title")}
            icon={Users}
            description={t("kills.fullRanking.description")}
            actions={
              <div className="flex flex-col gap-3 min-[2200px]:flex-row min-[2200px]:items-center min-[2200px]:justify-between">
                <div className="flex items-center gap-2 md:hidden">
                  <SearchInput
                    placeholder={t("kills.fullRanking.searchPlaceholder")}
                    onChange={handleSearchChange}
                    wrapperClassName="flex-1"
                  />
                  <StatsRankingFiltersMobile
                    world={settings.world}
                    minLvl={settings.minLvl}
                    maxLvl={settings.maxLvl}
                    period={settings.period}
                    onWorldChange={handleWorldChange}
                    onMinLvlChange={handleMinLvlChange}
                    onMaxLvlChange={handleMaxLvlChange}
                    onPeriodChange={handlePeriodChange}
                  />
                </div>
                <div className="hidden md:flex w-full flex-wrap items-center gap-2 min-[2200px]:w-auto min-[2200px]:justify-end">
                  <SearchInput
                    placeholder={t("kills.fullRanking.searchPlaceholder")}
                    onChange={handleSearchChange}
                    wrapperClassName="w-[200px]"
                  />
                  <LevelFilters
                    minLvl={settings.minLvl}
                    maxLvl={settings.maxLvl}
                    onMinLvlChange={handleMinLvlChange}
                    onMaxLvlChange={handleMaxLvlChange}
                  />
                  <KillStatsPeriodSelect
                    value={settings.period}
                    onValueChange={handlePeriodChange}
                  />
                  <WorldSwitcher
                    value={settings.world}
                    onValueChange={handleWorldChange}
                    showAllOption
                    width="w-[160px]"
                  />
                </div>
              </div>
            }
          />

          <SectionCard className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="relative min-w-0 w-full overflow-x-auto">
              {isLoading ? (
                <StatsRankingRowsSkeleton />
              ) : !data || paginatedData.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 p-16 h-full">
                  <p className="text-muted-foreground">
                    {t(
                      hasActiveFilters
                        ? "kills.memberRanking.filteredNoData"
                        : "kills.memberRanking.noData",
                    )}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid gap-2 p-3 md:hidden">
                    {paginatedData.map((member, index) => {
                      const rank = cursor + index + 1;

                      return (
                        <button
                          key={member.memberId}
                          type="button"
                          onClick={() => handleRowClick(member.memberId)}
                          className="min-w-0 border-b border-border p-3 last:border-b-0 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-medium text-muted-foreground">
                              <PodiumRankIcon rank={rank} fallback={rank} />
                            </div>
                            <Avatar className="size-8 shrink-0">
                              <AvatarImage
                                src={getDiscordAvatarUrl(
                                  member.memberUserId,
                                  member.memberAvatar,
                                  32,
                                )}
                              />
                              <AvatarFallback className="text-xs">
                                {member.memberName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-semibold">
                                {member.memberName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t("kills.memberRanking.totalKills")}:{" "}
                                <span className="font-medium tabular-nums text-foreground">
                                  {member.totalParticipations.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          {activeNpcTypes.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {activeNpcTypes.map((type) => (
                                <span
                                  key={type}
                                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                                >
                                  <span className="truncate">
                                    {t(`npcType.${type}`)}
                                  </span>
                                  <span className="font-medium tabular-nums text-foreground">
                                    {(
                                      member.participationsByType[type] ?? 0
                                    ).toLocaleString()}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  <Table className="hidden border-b md:table">
                    <TableHeader className="bg-background sticky top-0 z-10">
                      <TableRow className="border-b-1! border-border">
                        <TableHead className="whitespace-nowrap w-12 text-center">
                          #
                        </TableHead>
                        <TableHead className="whitespace-nowrap">
                          {t("kills.memberRanking.member")}
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-center">
                          {t("kills.memberRanking.totalKills")}
                        </TableHead>
                        {activeNpcTypes.map((type) => (
                          <TableHead
                            key={type}
                            className="whitespace-nowrap text-center"
                          >
                            {t(`npcType.${type}`)}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((member, index) => {
                        const rank = cursor + index + 1;

                        return (
                          <TableRow
                            key={member.memberId}
                            className="bg-background border-b border-border h-14 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => handleRowClick(member.memberId)}
                          >
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center justify-center w-8">
                                <PodiumRankIcon
                                  rank={rank}
                                  fallback={
                                    <span className="text-sm font-medium text-muted-foreground">
                                      {rank}
                                    </span>
                                  }
                                />
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage
                                    src={getDiscordAvatarUrl(
                                      member.memberUserId,
                                      member.memberAvatar,
                                      32,
                                    )}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {member.memberName[0]}
                                  </AvatarFallback>
                                </Avatar>
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
                                  {member.memberName}
                                </TextLink>
                              </div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <div className="text-center font-semibold tabular-nums">
                                {member.totalParticipations.toLocaleString()}
                              </div>
                            </TableCell>
                            {activeNpcTypes.map((type) => (
                              <TableCell
                                key={type}
                                className="whitespace-nowrap"
                              >
                                <div className="text-center tabular-nums">
                                  {(
                                    member.participationsByType[type] ?? 0
                                  ).toLocaleString()}
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              )}
            </div>

            <TablePaginationFooter
              totalLabel={t("kills.ranking.total", { count: total })}
              hasPrev={hasPrev}
              hasNext={hasNext}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
            />
          </SectionCard>
        </div>
      </ScrollArea>
    </div>
  );
};
