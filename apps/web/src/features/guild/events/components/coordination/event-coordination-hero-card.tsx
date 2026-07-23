import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, MapPin, Timer, UserPlus, X } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import { Badge } from "@lootlog/ui/components/badge";
import { Spinner } from "@lootlog/ui/components/spinner";
import { cn } from "@lootlog/ui/lib/utils";
import { NpcTile } from "@/components/tiles";
import { formatDurationHuman } from "../../utils/format-duration";
import {
  findSelfAssignGap,
  getCoordinationActionLabelKey,
  getCoordinationStatusLabelKey,
  getCoveragePercentage,
} from "../../utils/coordination-utils";
import { EventCoordinationPriorityBadge } from "./event-coordination-priority-badge";
import type { EventCoordinationResponseDtoHeroesItem } from "@lootlog/api-client/models/main/event-coordination-response-dto-heroes-item";

interface EventCoordinationHeroCardProps {
  hero: EventCoordinationResponseDtoHeroesItem;
  guildId: string;
  eventId: string;
  canWrite: boolean;
  canManage: boolean;
  assigningMapId: string | null;
  closingHeroId: string | null;
  onSelfAssign: (mapId: string) => void;
  onCloseWindow: (hero: EventCoordinationResponseDtoHeroesItem) => void;
}

export const EventCoordinationHeroCard = ({
  hero,
  guildId,
  eventId,
  canWrite,
  canManage,
  assigningMapId,
  closingHeroId,
  onSelfAssign,
  onCloseWindow,
}: EventCoordinationHeroCardProps) => {
  const { t } = useTranslation();
  const targetGap = findSelfAssignGap(hero);
  const coveragePercentage = getCoveragePercentage(hero.coverage);
  const isAssigning = targetGap?.mapId === assigningMapId;
  const isClosing = hero.heroId === closingHeroId;
  const timerStatus = hero.timer?.status ?? "NONE";
  const timerTime = getTimerDisplayTime(hero);

  return (
    <Card className="border-border bg-card/40 p-3 backdrop-blur-sm gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {hero.npcIcon ? (
            <NpcTile
              npc={{
                id: hero.npcId ?? undefined,
                name: hero.npcName,
                icon: hero.npcIcon,
              }}
            />
          ) : (
            <div className="rounded-xl bg-yellow-500/10 p-2.5 shadow-inner shadow-yellow-500/10">
              <Timer className="size-4 text-yellow-500" />
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold leading-tight break-words">
                {hero.npcName} {hero.npcLvl ? `(${hero.npcLvl})` : ""}
              </h3>
              <EventCoordinationPriorityBadge priority={hero.priority} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="gap-1 text-xs">
                <Timer className="size-3" />
                {t(getCoordinationStatusLabelKey(timerStatus))}
                {timerTime && <span>{timerTime}</span>}
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs">
                <MapPin className="size-3" />
                {t("events.coordination.hero.coverageShort", {
                  covered: hero.coverage.coveredMaps,
                  total: hero.coverage.totalMaps,
                  percentage: coveragePercentage,
                })}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {t(getCoordinationActionLabelKey(hero.recommendedAction))}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link
              to="/$guildId/events/$eventId/heroes/$heroId"
              params={{
                guildId,
                eventId,
                heroId: hero.heroId,
              }}
            >
              <ArrowRight className="size-3.5" />
              {t("events.coordination.actions.openMaps")}
            </Link>
          </Button>

          {canWrite && targetGap && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              disabled={isAssigning}
              onClick={() => onSelfAssign(targetGap.mapId)}
            >
              {isAssigning ? (
                <Spinner className="size-3.5" />
              ) : (
                <UserPlus className="size-3.5" />
              )}
              {t("events.coordination.actions.selfAssign")}
            </Button>
          )}

          {canManage && hero.timer && (
            <Button
              size="sm"
              variant="destructive"
              className="shrink-0"
              disabled={isClosing}
              onClick={() => onCloseWindow(hero)}
            >
              {isClosing ? (
                <Spinner className="size-3.5" />
              ) : (
                <X className="size-3.5" />
              )}
              {t("events.coordination.actions.close_window")}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full", getProgressClass(hero))}
            style={{ width: `${coveragePercentage}%` }}
          />
        </div>

        {hero.activeGaps.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hero.activeGaps.slice(0, 4).map((gap) => (
              <Badge
                key={gap.id}
                variant="outline"
                className="max-w-full gap-1 text-xs"
              >
                <span className="truncate">{gap.mapName}</span>
                <span className="text-muted-foreground">
                  {t(getGapLabelKey(gap.gapType))}
                </span>
                <span className="font-mono text-muted-foreground">
                  {formatDurationHuman(gap.durationSeconds)}
                </span>
              </Badge>
            ))}
            {hero.activeGaps.length > 4 && (
              <Badge variant="outline" className="text-xs">
                {t("events.coordination.hero.moreGaps", {
                  count: hero.activeGaps.length - 4,
                })}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

function getTimerDisplayTime(hero: EventCoordinationResponseDtoHeroesItem) {
  if (!hero.timer) {
    return null;
  }

  const timeSource =
    hero.timer.status === "WAITING"
      ? hero.timer.minSpawnTime
      : hero.timer.maxSpawnTime;

  return new Date(timeSource).toLocaleTimeString("pl-PL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getGapLabelKey(gapType: "UNASSIGNED" | "UNCOVERED") {
  if (gapType === "UNASSIGNED") {
    return "events.maps.gap.unassigned";
  }

  return "events.maps.gap.uncovered";
}

function getProgressClass(hero: EventCoordinationResponseDtoHeroesItem) {
  if (hero.priority === "CRITICAL") {
    return "bg-destructive";
  }

  if (hero.priority === "WARNING") {
    return "bg-amber-500";
  }

  if (hero.priority === "OK") {
    return "bg-green-500";
  }

  return "bg-muted-foreground/40";
}
