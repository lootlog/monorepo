import { PageHeader } from "@/components/common/page-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { TextLink } from "@lootlog/ui/components/text-link";
import { Link } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { StatsDetailLoading } from "./components/stats-detail-loading";
import { StatsNpcTypeSelect } from "./components/stats-npc-type-select";
import { useMemberStatsPage } from "./use-member-stats-page";

import { WorldSwitcher } from "@/components/common/world-switcher";
import { NpcTile } from "@/components/tiles/npc-tile";
import { PodiumRankIcon } from "@/components/ui/podium-rank-icon";
import { SearchInput } from "@/components/ui/search-input";
import { TablePaginationFooter } from "@/components/ui/table-pagination-footer";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import type {
  MemberKillsResponseDtoOutput,
  NpcType,
} from "@lootlog/client/main";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Badge } from "@lootlog/ui/components/badge";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { cn } from "cn";

import { LevelFilters } from "./components/level-filters";
import { NpcStatsFiltersMobile } from "./components/npc-stats-filters-mobile";
import type { useStatsSettings } from "./hooks/use-stats-settings";

import { KillStatsPeriodSelect } from "@/features/kills/components/kill-stats-period-select";

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

export const MemberStatsPage: React.FC = () => {
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
      return <StatsDetailLoading entity="member" />;
    }

    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-muted-foreground">
          {t("kills.memberStats.notFound")}
        </p>
      </div>
    );
  }

  const overview = data?.overview;
  const hasActiveFilters = hasMemberStatsFilters(settings, debouncedSearch);

  const { npcs, total, hasNext, totalParticipations } =
    getMemberStatsResponseView(data);

  const hasPrev = cursor > 0;

  const activeTypes = NPC_TYPE_ORDER.filter(
    (type) => (overview?.participationsByType[type] ?? 0) > 0,
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-background">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <PageHeader
            title={
              <span style={{ color: memberColor }}>{member.memberName}</span>
            }
            description={t("kills.memberStats.totalParticipations", {
              count: totalParticipations,
            })}
            actions={
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 shrink-0 border-2 border-background shadow-lg">
                  <AvatarImage
                    src={getDiscordAvatarUrl(
                      member.memberUserId,
                      member.memberAvatar,
                      128,
                    )}
                  />
                  <AvatarFallback className="text-lg">
                    {member.memberName[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
            }
          >
            {activeTypes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeTypes.map((type) => (
                  <Badge
                    key={type}
                    variant="secondary"
                    className="text-xs whitespace-nowrap px-2 py-0.5"
                  >
                    {t(`npcType.${type}`)}:{" "}
                    {overview?.participationsByType[type] ?? 0}
                  </Badge>
                ))}
              </div>
            )}
          </PageHeader>

          <SectionCard>
            <SectionCardContent className="flex flex-col gap-3">
              <div className="flex items-center gap-2 lg:hidden">
                <SearchInput
                  placeholder={t("kills.memberStats.searchPlaceholder")}
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  wrapperClassName="flex-1"
                />
                <NpcStatsFiltersMobile
                  world={settings.world}
                  npcType={settings.npcType}
                  minLvl={settings.minLvl}
                  maxLvl={settings.maxLvl}
                  period={settings.period}
                  onWorldChange={handleWorldChange}
                  onNpcTypeChange={handleNpcTypeChange}
                  onMinLvlChange={handleMinLvlChange}
                  onMaxLvlChange={handleMaxLvlChange}
                  onPeriodChange={handlePeriodChange}
                />
              </div>
              <div className="hidden lg:flex items-center gap-2 flex-wrap">
                <SearchInput
                  placeholder={t("kills.memberStats.searchPlaceholder")}
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  wrapperClassName="w-[200px]"
                />
                <LevelFilters
                  minLvl={settings.minLvl}
                  maxLvl={settings.maxLvl}
                  onMinLvlChange={handleMinLvlChange}
                  onMaxLvlChange={handleMaxLvlChange}
                  inputClassName="w-[100px]"
                />
                <WorldSwitcher
                  value={settings.world}
                  onValueChange={handleWorldChange}
                  showAllOption
                  width="w-[160px]"
                />
                <KillStatsPeriodSelect
                  value={settings.period}
                  onValueChange={handlePeriodChange}
                />
                <StatsNpcTypeSelect
                  value={settings.npcType}
                  onValueChange={handleNpcTypeChange}
                />
              </div>
            </SectionCardContent>
          </SectionCard>

          <SectionCard className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="relative min-w-0 w-full overflow-x-auto">
              {isLoading ? (
                <div>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex h-14 items-center gap-4 border-b border-border px-4"
                    >
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : npcs.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 p-16 h-full">
                  <Users className="h-12 w-12 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    {t(
                      hasActiveFilters
                        ? "kills.memberStats.filteredNoData"
                        : "kills.memberStats.noData",
                    )}
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-background sticky top-0 z-10">
                    <TableRow className="border-b-1! border-border h-12">
                      <TableHead className="w-16 text-center">
                        {t("kills.memberRanking.position")}
                      </TableHead>
                      <TableHead>{t("kills.memberStats.npc")}</TableHead>
                      <TableHead className="text-right">
                        {t("kills.memberStats.killCount")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {npcs.map((npc, index) => {
                      const globalIndex = cursor + index;

                      return (
                        <TableRow
                          key={npc.npcId}
                          className={cn(
                            "border-b border-border h-14 cursor-pointer hover:bg-muted/50 transition-colors",
                            globalIndex === 0 && "bg-yellow-500/5",
                          )}
                        >
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center">
                              <PodiumRankIcon
                                rank={globalIndex + 1}
                                className="size-5"
                                fallback={
                                  <span className="text-sm font-medium text-muted-foreground">
                                    {globalIndex + 1}
                                  </span>
                                }
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <TextLink
                              className="flex items-center gap-3 text-sm"
                              render=<Link
                                to="/$guildId/stats/npcs/$npcId"
                                params={{
                                  guildId,
                                  npcId: npc.npcId.toString(),
                                }}
                              />
                            >
                              {npc.npcIcon && (
                                <div className="w-8 flex-shrink-0">
                                  <NpcTile
                                    npc={{
                                      id: npc.npcId,
                                      name: npc.npcName,
                                      lvl: npc.npcLvl,
                                      icon: npc.npcIcon,
                                    }}
                                  />
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {npc.npcName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {npc.npcLvl}
                                  {npc.npcProf} • {t(`npcType.${npc.npcType}`)}
                                </span>
                              </div>
                            </TextLink>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold tabular-nums">
                              {npc.totalKills.toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            {(hasPrev || npcs.length > 0) && (
              <TablePaginationFooter
                totalLabel={t("kills.ranking.total", { count: total })}
                hasPrev={hasPrev}
                hasNext={hasNext}
                onPreviousPage={handlePreviousPage}
                onNextPage={handleNextPage}
              />
            )}
          </SectionCard>
        </div>
      </ScrollArea>
    </div>
  );
};
