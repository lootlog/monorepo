import { useTranslation } from "react-i18next";
import { useParams, Link } from "@tanstack/react-router";
import { Card } from "@lootlog/ui/components/card";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import {
  Skull,
  AlertCircle,
  Clock,
  Users,
  Package,
  Frown,
  Calculator,
} from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import { format, differenceInSeconds } from "date-fns";
import { pl } from "date-fns/locale";
import { Permission } from "@lootlog/types";
import { useKillDetail, type MatchingLoot } from "./hooks/queries/use-kill-detail";
import { KillParticipantsCard } from "./components/kill-participants-card";
import { MultipliersCard } from "./components/multipliers-card";
import { LootsListItem } from "@/features/guild/components/loots-list/loots-list-item";
import { KillMapsTimelineSection } from "./components/kill-maps-timeline-section";
import { NpcTile } from "@/components/tiles/npc-tile";
import { useGuildPermissions } from "@/hooks/api/guilds/use-guild-permissions";
import {
  ItemRarity,
  type LootSource,
  type Loot,
  type Item,
} from "@/hooks/api/loots/use-loots";
import type { Npc } from "@/hooks/api/game-data/use-npcs";
import type { Player } from "@/hooks/api/game-data/use-guild-players";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";

const adaptMatchingLootToLoot = (matchingLoot: MatchingLoot): Loot => ({
  id: matchingLoot.id,
  guildId: "",
  world: matchingLoot.world,
  source: matchingLoot.source as LootSource,
  location: matchingLoot.location,
  diedPlayers: [],
  createdAt: matchingLoot.createdAt,
  updatedAt: matchingLoot.updatedAt,
  lootShare: (matchingLoot.lootShare ?? {}) as Record<string, string[]>,
  commentsCount: 0,
  items: matchingLoot.items.map(
    (item): Item => ({
      id: item.id,
      hid: item.hid,
      name: item.name,
      icon: item.icon,
      stat: item.stat,
      type: item.type ?? "",
      rarity: (item.rarity as ItemRarity) ?? ItemRarity.COMMON,
      lvl: item.lvl ?? 0,
      prof: [],
    }),
  ),
  players: matchingLoot.players.map(
    (p): Player => ({
      id: String(p.id),
      accountId: 0,
      guildId: "",
      name: p.name,
      lvl: p.lvl ?? 0,
      prof: p.prof ?? "",
      icon: p.icon ?? "",
    }),
  ),
  npcs: matchingLoot.npcs.map(
    (n): Npc => ({
      id: n.id,
      name: n.name,
      lvl: n.lvl ?? 0,
      icon: n.icon ?? "",
      wt: 0,
      type: (n.type as Npc["type"]) ?? "COMMON",
      margonemType: 0,
    }),
  ),
  member: (matchingLoot.member
    ? {
        id: 0,
        userId: matchingLoot.member.userId,
        name: matchingLoot.member.name,
        avatar: matchingLoot.member.avatar,
        updatedAt: "",
        roles: [],
        active: true,
      }
    : null) as GuildMember,
});

const formatRespawnWindow = (minSpawn: string, maxSpawn: string): string => {
  const minDate = new Date(minSpawn);
  const maxDate = new Date(maxSpawn);
  const diffSeconds = differenceInSeconds(maxDate, minDate);

  if (diffSeconds < 60) {
    return `${diffSeconds}s`;
  }
  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;
  if (minutes < 60) {
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

export const KillDetail = () => {
  const { t } = useTranslation();
  const { guildId, eventId, heroId, killId } = useParams({ strict: false });

  const { data: permissions } = useGuildPermissions();
  const canEditPoints =
    permissions?.includes(Permission.OWNER) ||
    permissions?.includes(Permission.ADMIN);

  const { data, isLoading, error } = useKillDetail({
    guildId: guildId ?? "",
    eventId: eventId ?? "",
    heroId: heroId ?? "",
    killId: killId ?? "",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-muted-foreground">
          {t("events.killDetail.notFound")}
        </p>
        <Link
          to="/$guildId/events/$eventId/heroes/$heroId"
          params={{ guildId: guildId ?? "", eventId: eventId ?? "", heroId: heroId ?? "" }}
        >
          <Button variant="outline">{t("events.common.backToHero")}</Button>
        </Link>
      </div>
    );
  }

  const { kill, loots, eventConfig } = data;
  const participants = kill.points ?? [];
  const respawnWindow = formatRespawnWindow(kill.minSpawnTimeAtKill, kill.maxSpawnTimeAtKill);

  return (
    <div className="flex flex-col h-full min-h-0 bg-background/50">
      {/* Header */}
      <div className="bg-background w-full flex items-center border-b px-3 shrink-0 py-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {kill.heroNpc.npcIcon ? (
            <NpcTile
              npc={{
                id: kill.heroNpc.npcId ?? 0,
                name: kill.heroNpc.npcName,
                icon: kill.heroNpc.npcIcon,
              }}
            />
          ) : (
            <div className="p-2 rounded-lg bg-red-500/10">
              <Skull className="size-4 text-red-500" />
            </div>
          )}
          <div>
            <h2 className="text-sm font-semibold leading-tight">
              {kill.heroNpc.npcName}
            </h2>
            <p className="text-xs text-muted-foreground leading-tight">
              {format(new Date(kill.killedAt), "d MMMM yyyy, HH:mm:ss", { locale: pl })}
            </p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="px-3 py-3 flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left column - Participants & Map Coverage */}
            <div className="lg:col-span-2 space-y-4">
              {/* Participants */}
              <KillParticipantsCard
                participants={participants}
                guildId={guildId}
                eventId={eventId}
                killId={killId}
                canEdit={canEditPoints}
              />

              {/* Map Coverage Timeline */}
              <KillMapsTimelineSection
                eventId={eventId ?? ""}
                heroId={heroId ?? ""}
                killId={killId ?? ""}
                minSpawnTimeAtKill={kill.minSpawnTimeAtKill}
                killedAt={kill.killedAt}
                t={t}
              />
            </div>

            {/* Right column - Stats, Multipliers & Loots */}
            <div className="space-y-4">
              {/* Stats Cards */}
              <Card className="p-3 bg-card/40 backdrop-blur-sm border-border">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-green-500/10">
                      <Users className="w-4 h-4 text-green-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{participants.length}</p>
                      <p className="text-xs text-muted-foreground">{t("events.killDetail.participantCount")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-blue-500/10">
                      <Package className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{loots.length}</p>
                      <p className="text-xs text-muted-foreground">{t("events.killDetail.lootCount")}</p>
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 cursor-help">
                        <div className="p-1.5 rounded-md bg-orange-500/10">
                          <Clock className="w-4 h-4 text-orange-500" />
                        </div>
                        <div>
                          <p className="text-lg font-bold">{respawnWindow}</p>
                          <p className="text-xs text-muted-foreground">{t("events.killDetail.respawnTime")}</p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">{t("events.killDetail.respawnTimeDescription")}</p>
                        <p>{t("events.killDetail.respawnMinLabel")}: {format(new Date(kill.minSpawnTimeAtKill), "d MMMM yyyy, HH:mm:ss", { locale: pl })}</p>
                        <p>{t("events.killDetail.killTimeLabel")}: {format(new Date(kill.killedAt), "d MMMM yyyy, HH:mm:ss", { locale: pl })}</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-md", eventConfig.autoCalculatePoints ? "bg-primary/10" : "bg-muted")}>
                      <Calculator className={cn("w-4 h-4", eventConfig.autoCalculatePoints ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="text-lg font-bold">
                        {eventConfig.autoCalculatePoints ? t("events.header.autoPointsOn") : t("events.header.autoPointsOff")}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("events.settings.autoCalculatePoints")}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Multipliers */}
              <MultipliersCard eventConfig={eventConfig} t={t} />

              {/* Matching Loots */}
              <Card className="p-3 bg-card/40 backdrop-blur-sm border-border">
                <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  {t("events.killDetail.matchingLoots")}
                </h3>

                {loots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                    <Frown className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">{t("events.killDetail.noLoots")}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loots.map((loot) => (
                      <LootsListItem
                        key={loot.id}
                        loot={adaptMatchingLootToLoot(loot)}
                        canManageLoots={false}
                      />
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
