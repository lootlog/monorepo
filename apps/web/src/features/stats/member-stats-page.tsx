import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "@tanstack/react-router";
import { useLocalStorage } from "usehooks-ts";
import { Crown, Medal, Search, Trophy, Users } from "lucide-react";
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@lootlog/ui/components/pagination";
import { Spinner } from "@lootlog/ui/components/spinner";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { NpcTile } from "@/components/tiles/npc-tile";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { cn } from "@lootlog/ui/lib/utils";
import { useWorlds } from "@/hooks/api/game-data/use-worlds";
import { useMemberKills } from "./hooks/use-member-kills";
import { useGuildMembers } from "@/hooks/api/members/use-guild-members";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { TRACKABLE_NPC_TYPES } from "./constants";
import type { NpcType } from "./hooks/use-guild-kill-stats";

const ITEMS_PER_PAGE = 20;
const WORLD_STORAGE_KEY = "stats-member-kills-world";
const NPC_TYPE_STORAGE_KEY = "stats-member-kills-npc-type";

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
  const [selectedWorld, setSelectedWorld] = useLocalStorage<string | null>(
    WORLD_STORAGE_KEY,
    null,
  );
  const [selectedNpcType, setSelectedNpcType] = useLocalStorage<
    NpcType | "ALL"
  >(NPC_TYPE_STORAGE_KEY, "ALL");
  const { data: worlds } = useWorlds();
  const { data, isLoading } = useMemberKills(Number.parseInt(memberId, 10), {
    world: selectedWorld ?? undefined,
    npcTypes: selectedNpcType === "ALL" ? undefined : [selectedNpcType],
    search: debouncedSearch || undefined,
    limit: ITEMS_PER_PAGE,
    cursor,
  });
  const { data: guildMembers } = useGuildMembers(true);

  const handleWorldChange = (value: string) => {
    setSelectedWorld(value === "ALL" ? null : value);
    setCursor(0);
  };

  const handleNpcTypeChange = (value: string) => {
    setSelectedNpcType(value as NpcType | "ALL");
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
    <div className="h-full flex flex-col">
      <div className="p-4 pb-4 bg-background border-b">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-background shadow-lg">
              <AvatarImage
                src={getDiscordAvatarUrl(
                  member.memberUserId,
                  member.memberAvatar,
                  128,
                )}
              />
              <AvatarFallback className="text-xl">
                {member.memberName[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <h1 className="text-xl font-bold" style={{ color: memberColor }}>
                {member.memberName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("kills.memberStats.totalParticipations", {
                  count: overview?.totalParticipations ?? 0,
                })}
              </p>
              {activeTypes.length > 0 && (
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {activeTypes.map((type) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {t(`npcType.${type}`)}:{" "}
                      {overview?.participationsByType[type] ?? 0}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("kills.memberStats.searchPlaceholder")}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9 w-[200px]"
              />
            </div>
            <Select
              value={selectedWorld ?? "ALL"}
              onValueChange={handleWorldChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t("kills.home.filters.world")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  {t("kills.home.filters.allWorlds")}
                </SelectItem>
                {worlds?.map((world) => (
                  <SelectItem key={world} value={world}>
                    {world.charAt(0).toUpperCase() + world.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedNpcType} onValueChange={handleNpcTypeChange}>
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
        </div>
      </div>

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
          <Table className="border-b">
            <TableHeader className="bg-background sticky top-0 z-10">
              <TableRow className="border-b-1! border-border">
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
                      "bg-background/30 border-b border-border h-14 cursor-pointer hover:bg-muted/50 transition-colors",
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
                        params={{ guildId, npcId: npc.npcId.toString() }}
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
                          <span className="font-medium">{npc.npcName}</span>
                          <span className="text-xs text-muted-foreground">
                            {npc.npcLvl}
                            {npc.npcProf} • {t(`npcType.${npc.npcType}`)}
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

      {npcs.length > 0 && (
        <div className="h-14 shrink-0 bg-background border-t py-4 flex items-center justify-between px-4">
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
    </div>
  );
};
