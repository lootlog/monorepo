import { Link } from "@tanstack/react-router";
import { Clock, Users, Skull, ChevronRight, Hand } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { NpcTile } from "@/components/tiles";
import type { HeroKill } from "../../hooks/queries/use-hero-kill-history";
import { formatDateTime } from "../../utils/format-date";

type KillHistoryCardCondensedProps = {
  kill: HeroKill;
  variant: "compact" | "minimal";
  showHeroName: boolean;
  participantsCount: number;
  respawnTime: string | null;
  guildId?: string;
  eventId?: string;
};

export const KillHistoryCardCondensed = ({
  kill,
  variant,
  showHeroName,
  participantsCount,
  respawnTime,
  guildId,
  eventId,
}: KillHistoryCardCondensedProps) => {
  const { t } = useTranslation();
  const isCompact = variant === "compact";
  const content = (
    <div className="p-3 rounded-lg border border-border hover:border-primary bg-card/30 hover:bg-card transition-colors cursor-pointer">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="flex items-center gap-3 text-sm shrink-0 sm:self-auto">
          {kill.isManualClose && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Badge
                    variant="outline"
                    className="gap-1 text-yellow-600 border-yellow-600/50"
                  >
                    <Hand className="w-3 h-3" />
                  </Badge>
                }
              />
              <TooltipContent>
                <p>{t("events.kills.manualClose")}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {isCompact && respawnTime && (
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
          <span className="text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />
            {participantsCount}
          </span>
          {!isCompact && (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
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
};
