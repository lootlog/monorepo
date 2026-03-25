import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "@tanstack/react-router";
import { Crown, Medal, Search, Trophy, Users } from "lucide-react";
import { Card } from "@lootlog/ui/components/card";
import { useDebounce } from "@/hooks/use-debounce";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Badge } from "@lootlog/ui/components/badge";
import { Input } from "@lootlog/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lootlog/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lootlog/ui/components/table";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@lootlog/ui/components/pagination";
import { Spinner } from "@lootlog/ui/components/spinner";
import { NpcTile } from "@/components/tiles/npc-tile";
import { WorldSwitcher } from "@/components/common/world-switcher";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { cn } from "@lootlog/ui/lib/utils";
import { useMemberKills } from "./hooks/use-member-kills";
import { useStatsSettings } from "./hooks/use-stats-settings";
import { useGuildMembers } from "@/hooks/api/members/use-guild-members";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { TRACKABLE_NPC_TYPES } from "./constants";
import { LevelFilters } from "./components/level-filters";
import { NpcStatsFiltersMobile } from "./components/npc-stats-filters-mobile";
import type { NpcType } from "./hooks/use-guild-kill-stats";

const ITEMS_PER_PAGE = 40;

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

const getRankIcon = (index: number) => {
  switch (index) {
    case 0:
      return <Crown className="h-5 w-5 text-yellow-500" />;
    case 1:
      return <Trophy className="h-5 w-5 text-slate-400" />;
    case 2:
      return <Medal className="h-5 w-5 text-amber-600" />;
    default:
      return null;
  }
};

export const MemberStatsPage: React.FC = () => {
  const { t } = useTranslation();
  const { memberId, guildId } = useParams({
    from: "/_authenticated/$guildId/stats/members/$memberId",
  });

  const [cursor, setCursor] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const {
    settings,
    debouncedMinLvl,
    debouncedMaxLvl,
    setWorld,
    setMinLvl,
    setMaxLvl,
    setNpcType,
  } = useStatsSettings("member");
  const { data, isLoading } = useMemberKills(Number.parseInt(memberId, 10), {
    world: settings.world ?? undefined,
    npcTypes:
      settings.npcType && settings.npcType !== "ALL"
        ? [settings.npcType]
        : undefined,
    search: debouncedSearch || undefined,
    limit: ITEMS_PER_PAGE,
    cursor,
    minLvl: debouncedMinLvl,
    maxLvl: debouncedMaxLvl,
  });
  const { data: guildMembers } = useGuildMembers(true);

  const handleWorldChange = (value: string | null) => {
    setWorld(value);
    setCursor(0);
  };

  const handleNpcTypeChange = (value: string) => {
    setNpcType(value as NpcType | "ALL");
    setCursor(0);
  };

  const handleMinLvlChange = (value: string) => {
    setMinLvl(value);
    setCursor(0);
  };

  const handleMaxLvlChange = (value: string) => {
    setMaxLvl(value);
    setCursor(0);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCursor(0);
  };

  const handleNextPage = () => {
    if (data?.pagination?.hasNext) {
      setCursor(cursor + ITEMS_PER_PAGE);
    }
  };

  const handlePreviousPage = () => {
    if (cursor > 0) {
      setCursor(Math.max(0, cursor - ITEMS_PER_PAGE));
    }
  };

  const guildMember = guildMembers?.find(
    (m) => m.userId === data?.member?.memberUserId,
  );
  const adaptedMember = guildMember
    ? {
        roles: guildMember.roles.map((r) => ({
          position: r.position ?? 0,
          color: r.color,
        })),
      }
    : undefined;
  const memberColor = useMemberColor(adaptedMember);

  const member = data?.member;

  if (!member) {
    if (isLoading) {
      return (
        <div className="h-full flex flex-col items-center justify-center">
          <Spinner className="size-8" />
        </div>
      );
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
  const npcs = data?.npcs ?? [];
  const pagination = data?.pagination;
  const total = pagination?.total ?? 0;
  const hasNext = pagination?.hasNext ?? false;
  const hasPrev = cursor > 0;

  const activeTypes = NPC_TYPE_ORDER.filter(
    (type) => (overview?.participationsByType[type] ?? 0) > 0,
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-background/50">
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Card className="border-border bg-card/60 p-4 backdrop-blur-sm shrink-0">
                <div className="flex items-center gap-3 mb-3">
                  <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-base font-semibold">
                    {member.memberName}
                  </h2>
                </div>

                <div className="flex items-center gap-2 lg:hidden">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("kills.memberStats.searchPlaceholder")}
                      value={search}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-9 w-full"
                    />
                  </div>
                  <NpcStatsFiltersMobile
                    world={settings.world}
                    npcType={settings.npcType}
                    minLvl={settings.minLvl}
                    maxLvl={settings.maxLvl}
                    onWorldChange={handleWorldChange}
                    onNpcTypeChange={handleNpcTypeChange}
                    onMinLvlChange={handleMinLvlChange}
                    onMaxLvlChange={handleMaxLvlChange}
                  />
                </div>

                <div className="hidden lg:flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("kills.memberStats.searchPlaceholder")}
                      value={search}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-9 w-[200px]"
                    />
                  </div>
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
                  <Select
                    value={settings.npcType ?? "ALL"}
                    onValueChange={handleNpcTypeChange}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">
                        {t("kills.filters.allTypes")}
                      </SelectItem>
                      {TRACKABLE_NPC_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {t(`npcType.${type}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Card>

              <Card className="flex-1 min-h-0 flex flex-col border-border bg-card/40 p-0 backdrop-blur-sm overflow-hidden gap-0">
                <ScrollArea className="relative flex-1 min-h-0 w-full">
                  {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                      <Spinner className="size-8" />
                    </div>
                  ) : npcs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 p-16 h-full">
                      <Users className="h-12 w-12 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        {t("kills.memberStats.noData")}
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
                                  {getRankIcon(globalIndex) ?? (
                                    <span className="text-sm font-medium text-muted-foreground">
                                      {globalIndex + 1}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Link
                                  to="/$guildId/stats/npcs/$npcId"
                                  params={{
                                    guildId,
                                    npcId: npc.npcId.toString(),
                                  }}
                                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
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
                                      {npc.npcProf} •{" "}
                                      {t(`npcType.${npc.npcType}`)}
                                    </span>
                                  </div>
                                </Link>
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
                </ScrollArea>

                {(hasPrev || npcs.length > 0) && (
                  <div className="h-14 shrink-0 border-t border-border py-4 flex items-center justify-between px-4">
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      {t("kills.ranking.total", { count: total })}
                    </div>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={handlePreviousPage}
                            className={
                              !hasPrev
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                        <PaginationItem>
                          <PaginationNext
                            onClick={handleNextPage}
                            className={
                              !hasNext
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="border-border bg-card/40 p-4 backdrop-blur-sm">
                <div className="flex lg:flex-col items-center gap-3">
                  <Avatar className="h-12 w-12 lg:h-20 lg:w-20 shrink-0 border-2 border-background shadow-lg">
                    <AvatarImage
                      src={getDiscordAvatarUrl(
                        member.memberUserId,
                        member.memberAvatar,
                        128,
                      )}
                    />
                    <AvatarFallback className="text-lg lg:text-2xl">
                      {member.memberName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 lg:items-center">
                    <h1
                      className="text-lg lg:text-xl font-bold truncate"
                      style={{ color: memberColor }}
                    >
                      {member.memberName}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {t("kills.memberStats.totalParticipations", {
                        count: overview?.totalParticipations ?? 0,
                      })}
                    </p>
                  </div>
                </div>
                {activeTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 lg:justify-center">
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
              </Card>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
