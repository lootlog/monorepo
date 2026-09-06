import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@/components/common/section-card/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, MapPin, Timer, UserPlus, X } from "lucide-react";
import { Button } from "@lootlog/ui/components/button";
import { Badge } from "@lootlog/ui/components/badge";
import { Spinner } from "@lootlog/ui/components/spinner";
import { Progress } from "@lootlog/ui/components/progress";
import { NpcTile } from "@/components/tiles";
import { formatDurationHuman } from "../../utils/format-duration";
import {
  findSelfAssignGap,
  getCoordinationActionLabelKey,
  getCoordinationStatusLabelKey,
  getCoveragePercentage,
} from "../../utils/coordination-utils";
import { getAssignmentAvailability } from "../../utils/get-assignment-availability";
import { useAssignmentCountdown } from "../../hooks/utils/use-assignment-countdown";
import { EventCoordinationPriorityBadge } from "./event-coordination-priority-badge";
import type { EventCoordinationResponseDtoHeroesItem } from "@lootlog/client/main";

interface EventCoordinationHeroCardProps {
  hero: EventCoordinationResponseDtoHeroesItem;
  guildId: string;
  eventId: string;
  assignmentTimeoutMinutes: number;
  canWrite: boolean;
  canManage: boolean;
  assigningMapId: string | null;
  closingHeroId: string | null;
  onSelfAssign: (
    mapId: string,
    hero: EventCoordinationResponseDtoHeroesItem,
  ) => void;
  onCloseWindow: (hero: EventCoordinationResponseDtoHeroesItem) => void;
}

export const EventCoordinationHeroCard = ({
  hero,
  guildId,
  eventId,
  assignmentTimeoutMinutes,
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
  const assignmentAvailability = getAssignmentAvailability({
    assignmentTimeoutMinutes,
    timer: hero.timer,
  });
  const {
    isEnabled: isAssignmentEnabled,
    formattedTime: assignmentCountdownTime,
  } = useAssignmentCountdown(
    !assignmentAvailability.allowed,
    assignmentAvailability.enabledAt,
  );

  return (
    <SectionCard>
      <SectionCardHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {hero.npcIcon ? (
              <NpcTile
                npc={{
                  id: hero.npcId ?? undefined,
                  name: hero.npcName,
                  icon: hero.npcIcon,
                }}
              />
            ) : (
              <div className="rounded-xl bg-yellow-500/10 p-2.5">
                <Timer className="size-4 text-yellow-500" />
              </div>
            )}
            {hero.npcName} {hero.npcLvl ? `(${hero.npcLvl})` : ""}
            <EventCoordinationPriorityBadge priority={hero.priority} />
          </span>
        }
        description={
          <>
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
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              render={
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
              }
              nativeButton={false}
            />

            {canWrite && targetGap && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                disabled={isAssigning || !isAssignmentEnabled}
                onClick={() => onSelfAssign(targetGap.mapId, hero)}
              >
                {isAssigning ? (
                  <Spinner className="size-3.5" />
                ) : (
                  <UserPlus className="size-3.5" />
                )}
                {!isAssignmentEnabled && assignmentCountdownTime
                  ? t("events.maps.assignmentDisabledWithTime", {
                      time: assignmentCountdownTime,
                    })
                  : t("events.coordination.actions.selfAssign")}
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
        }
      />
      <SectionCardContent className="space-y-3">
        <div className="flex flex-col gap-2">
          <Progress
            value={coveragePercentage}
            variant={getProgressVariant(hero)}
            aria-label={t("events.coordination.hero.coverageShort", {
              covered: hero.coverage.coveredMaps,
              total: hero.coverage.totalMaps,
              percentage: coveragePercentage,
            })}
            className="[&_[data-slot=progress-track]]:h-2"
          />

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
      </SectionCardContent>
    </SectionCard>
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

function getProgressVariant(hero: EventCoordinationResponseDtoHeroesItem) {
  if (hero.priority === "CRITICAL") {
    return "alert" as const;
  }

  if (hero.priority === "WARNING") {
    return "timer" as const;
  }

  if (hero.priority === "OK") {
    return "ready" as const;
  }

  return "default" as const;
}
