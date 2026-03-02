import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { differenceInSeconds } from "date-fns";
import { Clock, Users, Skull, ChevronRight, Hand } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "@lootlog/ui/lib/utils";
import { NpcTile } from "@/components/tiles";
import type { HeroKill } from "../../hooks/queries/use-hero-kill-history";
import { KillParticipantsList } from "./kill-participants-list";
import {
  formatDurationHuman,
  formatDateTime,
  formatDateTimeFull,
} from "../../utils";

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
  return formatDurationHuman(diffSeconds);
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

  const respawnTime = kill.isManualClose
    ? null
    : formatRespawnTime(kill.minSpawnTimeAtKill, kill.killedAt);

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
                {formatDateTime(new Date(kill.killedAt))}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm shrink-0">
            {kill.isManualClose && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="gap-1 text-yellow-600 border-yellow-600/50"
                  >
                    <Hand className="w-3 h-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("events.kills.manualClose")}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {respawnTime && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    {respawnTime}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("events.kills.respawnTime")}</p>
                </TooltipContent>
              </Tooltip>
            )}

            <span className="text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              {participants.length}
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
                {formatDateTime(new Date(kill.killedAt))}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm shrink-0">
            {kill.isManualClose && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="gap-1 text-yellow-600 border-yellow-600/50"
                  >
                    <Hand className="w-3 h-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t("events.kills.manualClose")}</p>
                </TooltipContent>
              </Tooltip>
            )}
            <span className="text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              {participants.length}
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
              {formatDateTimeFull(new Date(kill.killedAt))}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {kill.isManualClose && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className="gap-1 text-yellow-600 border-yellow-600/50"
                >
                  <Hand className="w-3 h-3" />
                  {t("events.kills.manualClose")}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("events.kills.manualCloseDescription")}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {respawnTime && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1">
                  <Clock className="w-3 h-3" />
                  {respawnTime}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("events.kills.respawnTime")}</p>
              </TooltipContent>
            </Tooltip>
          )}

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
