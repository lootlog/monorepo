import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { format, differenceInSeconds } from "date-fns";
import { pl } from "date-fns/locale";
import { Clock, Users, Skull, ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "@lootlog/ui/lib/utils";
import { NpcTile } from "@/components/tiles";
import type { HeroKill } from "../hooks/queries/use-hero-kill-history";
import { KillParticipantsList } from "./kill-participants-list";

interface KillHistoryCardProps {
  kill: HeroKill;
  showHeroName?: boolean;
  expanded?: boolean;
  minimal?: boolean;
  compact?: boolean;
  guildId?: string;
  eventId?: string;
}

const formatRespawnTime = (minSpawn: string, killedAt: string): string => {
  const minDate = new Date(minSpawn);
  const killedDate = new Date(killedAt);
  const diffSeconds = differenceInSeconds(killedDate, minDate);

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

export const KillHistoryCard = ({
  kill,
  showHeroName = false,
  expanded = false,
  minimal = false,
  compact = false,
  guildId,
  eventId,
}: KillHistoryCardProps) => {
  const { t } = useTranslation();

  const participants = kill.participants ?? [];
  const totalPoints = participants.reduce((sum, p) => sum + p.points, 0);
  const avgMultiplier =
    participants.length > 0
      ? participants.reduce((sum, p) => sum + p.appliedMultiplier, 0) /
        participants.length
      : 1;

  const respawnTime = formatRespawnTime(kill.minSpawnTimeAtKill, kill.killedAt);

  if (compact) {
    const content = (
      <div className="p-3 rounded-lg border border-border hover:border-primary bg-card/30 hover:bg-card/50 transition-colors cursor-pointer">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {kill.heroNpc.npcIcon ? (
              <NpcTile
                npc={{
                  id: kill.heroNpc.npcId ?? undefined,
                  name: kill.heroNpc.npcName,
                  icon: kill.heroNpc.npcIcon,
                }}
              />
            ) : (
              <Skull className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <div className="min-w-0">
              {showHeroName && (
                <p className="font-medium text-sm truncate">
                  {kill.heroNpc.npcName}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {format(new Date(kill.killedAt), "d MMM, HH:mm", {
                  locale: pl,
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {respawnTime}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {t("events.kills.respawnTime", "Czas od respawnu do zabicia")}
                </p>
              </TooltipContent>
            </Tooltip>

            {avgMultiplier > 1 && (
              <Badge variant="secondary" className="font-bold">
                x{avgMultiplier.toFixed(2)}
              </Badge>
            )}

            <span className="text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              {participants.length}
            </span>

            <span className="font-bold text-primary">
              {t("events.kills.pointCount", { count: totalPoints })}
            </span>
          </div>
        </div>
      </div>
    );

    if (guildId && eventId) {
      return (
        <Link
          to="/$guildId/events/$eventId/heroes/$heroId/kills/$killId"
          params={{
            guildId,
            eventId,
            heroId: kill.heroNpcId,
            killId: kill.id,
          }}
        >
          {content}
        </Link>
      );
    }

    return content;
  }

  if (minimal) {
    const content = (
      <div className="p-3 rounded-lg border border-border bg-card/30 hover:bg-card/50 transition-colors cursor-pointer">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {kill.heroNpc.npcIcon ? (
              <NpcTile
                npc={{
                  id: kill.heroNpc.npcId ?? undefined,
                  name: kill.heroNpc.npcName,
                  icon: kill.heroNpc.npcIcon,
                }}
              />
            ) : (
              <Skull className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <div className="min-w-0">
              {showHeroName && (
                <p className="font-medium text-sm truncate">
                  {kill.heroNpc.npcName}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {format(new Date(kill.killedAt), "d MMM, HH:mm", {
                  locale: pl,
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm shrink-0">
            <span className="text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              {participants.length}
            </span>
            <span className="font-bold text-primary">
              {t("events.kills.pointCount", { count: totalPoints })}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    );

    if (guildId && eventId) {
      return (
        <Link
          to="/$guildId/events/$eventId/heroes/$heroId/kills/$killId"
          params={{
            guildId,
            eventId,
            heroId: kill.heroNpcId,
            killId: kill.id,
          }}
        >
          {content}
        </Link>
      );
    }

    return content;
  }

  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-border/50 bg-card/30 hover:bg-card/50 transition-colors",
        expanded && "bg-card/50",
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {kill.heroNpc.npcIcon ? (
            <NpcTile
              npc={{
                id: kill.heroNpc.npcId ?? undefined,
                name: kill.heroNpc.npcName,
                icon: kill.heroNpc.npcIcon,
              }}
            />
          ) : (
            <Skull className="w-5 h-5 text-red-500 shrink-0" />
          )}
          <div className="min-w-0">
            {showHeroName && (
              <p className="font-semibold truncate">{kill.heroNpc.npcName}</p>
            )}
            <p className="text-sm text-muted-foreground">
              {format(new Date(kill.killedAt), "d MMM yyyy, HH:mm", {
                locale: pl,
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {respawnTime}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {t("events.kills.respawnTime", "Czas od respawnu do zabicia")}
              </p>
            </TooltipContent>
          </Tooltip>

          {avgMultiplier > 1 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="secondary" className="font-bold">
                  x{avgMultiplier.toFixed(2)}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("events.kills.multipliers.title")}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-2 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>
            {t("events.kills.participantCount", { count: participants.length })}
          </span>
        </div>
        <div className="font-bold text-primary">
          {t("events.kills.pointCount", { count: totalPoints })}
        </div>
      </div>

      {expanded ? (
        <KillParticipantsList participants={participants} />
      ) : (
        <KillParticipantsList participants={participants} compact />
      )}
    </div>
  );
};
