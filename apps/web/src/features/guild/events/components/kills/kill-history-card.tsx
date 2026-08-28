import { useTranslation } from "react-i18next";
import { differenceInSeconds } from "date-fns";
import { Clock, Users, Skull, Hand } from "lucide-react";
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
import { formatDateTimeFull } from "../../utils/format-date";
import { formatDurationHuman } from "../../utils/format-duration";
import { KillHistoryCardCondensed } from "./kill-history-card-condensed";

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

  const participants = kill.points ?? [];
  const totalPoints = participants.reduce((sum, p) => sum + p.points, 0);

  const respawnTime = kill.isManualClose
    ? null
    : formatRespawnTime(kill.minSpawnTimeAtKill, kill.killedAt);

  if (compact) {
    return (
      <KillHistoryCardCondensed
        kill={kill}
        variant="compact"
        showHeroName={showHeroName}
        participantsCount={participants.length}
        respawnTime={respawnTime}
        guildId={guildId}
        eventId={eventId}
      />
    );
  }

  if (minimal) {
    return (
      <KillHistoryCardCondensed
        kill={kill}
        variant="minimal"
        showHeroName={showHeroName}
        participantsCount={participants.length}
        respawnTime={respawnTime}
        guildId={guildId}
        eventId={eventId}
      />
    );
  }

  return (
    <div
      className={cn(
        "p-3 rounded-lg border border-border/50 bg-card/30 hover:bg-card transition-colors",
        expanded && "bg-card",
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
              <TooltipTrigger
                render={
                  <Badge
                    variant="outline"
                    className="gap-1 text-yellow-600 border-yellow-600/50"
                  >
                    <Hand className="w-3 h-3" />
                    {t("events.kills.manualClose")}
                  </Badge>
                }
              />
              <TooltipContent>
                <p>{t("events.kills.manualCloseDescription")}</p>
              </TooltipContent>
            </Tooltip>
          )}

          {respawnTime && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    {respawnTime}
                  </Badge>
                }
              />
              <TooltipContent>
                <p>{t("events.kills.respawnTime")}</p>
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
