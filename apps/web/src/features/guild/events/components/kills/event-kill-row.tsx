import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { differenceInSeconds } from "date-fns";
import { ChevronRight, Clock, Hand, Skull, Users } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { NpcTile } from "@/components/tiles";
import type { HeroKill } from "../../hooks/queries/use-hero-kill-history";
import { formatDateTime } from "../../utils/format-date";
import { formatDurationHuman } from "../../utils/format-duration";

type EventKillRowProps = {
  kill: HeroKill;
  guildId: string;
  eventId: string;
};

export const EventKillRow = ({ kill, guildId, eventId }: EventKillRowProps) => {
  const { t } = useTranslation();
  const participantCount = kill.points?.length ?? 0;
  const respawnTime = kill.isManualClose
    ? null
    : formatDurationHuman(
        differenceInSeconds(
          new Date(kill.killedAt),
          new Date(kill.minSpawnTimeAtKill),
        ),
      );

  return (
    <Link
      to="/$guildId/events/$eventId/heroes/$heroId/kills/$killId"
      params={{
        guildId,
        eventId,
        heroId: kill.heroNpcId,
        killId: kill.id,
      }}
      className="group block rounded-xl border border-border bg-card px-3 py-2.5 outline-none transition-colors hover:border-primary/30 hover:bg-muted/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:px-4"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center">
          {kill.heroNpc.npcIcon ? (
            <NpcTile
              npc={{
                id: kill.heroNpc.npcId ?? undefined,
                name: kill.heroNpc.npcName,
                icon: kill.heroNpc.npcIcon,
              }}
            />
          ) : (
            <Skull className="size-4 text-destructive" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold group-hover:underline">
              {kill.heroNpc.npcName}
            </p>
            <p className="mt-1 whitespace-nowrap text-xs leading-none text-muted-foreground">
              {formatDateTime(new Date(kill.killedAt))}
            </p>
          </div>

          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            {kill.isManualClose ? (
              <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-yellow-500">
                <Hand className="size-3" />
                {t("events.kills.manualCloseLabel")}
              </span>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    aria-label={t("events.kills.respawnTime")}
                    className="inline-flex cursor-help items-center gap-1 whitespace-nowrap"
                  >
                    <Clock className="size-3 text-muted-foreground" />
                    <span className="text-xs font-medium tabular-nums">
                      {respawnTime}
                    </span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {t("events.kills.respawnTime")}
                </TooltipContent>
              </Tooltip>
            )}

            <div className="inline-flex items-baseline gap-1 whitespace-nowrap">
              <Users className="size-3 self-center text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                {t("events.kills.participants")}
              </span>
              <span className="text-xs font-medium tabular-nums">
                {participantCount}
              </span>
            </div>
          </div>
        </div>

        <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
};
