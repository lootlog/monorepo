import { formatNpcLevel } from "@lootlog/domain/profession";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCard } from "@/components/common/section-card/section-card";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MapPin, Timer, UserPlus, X } from "lucide-react";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { Button } from "@lootlog/ui/components/button";
import { Badge } from "@lootlog/ui/components/badge";
import { Progress } from "@lootlog/ui/components/progress";
import { HeroAvatar } from "../shared/hero-avatar";
import { formatDurationHuman } from "../../utils/format-duration";
import {
  findSelfAssignGap,
  getCoordinationActionLabelKey,
  getCoordinationPriorityTone,
  getCoordinationStatusLabelKey,
  getCoveragePercentage,
} from "../../utils/coordination-utils";
import { formatTimeShort } from "../../utils/format-date";
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
          <>
            {hero.npcName}
            {hero.npcLvl ? (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {formatNpcLevel(hero.npcLvl)}
              </span>
            ) : null}
          </>
        }
        actions={
          <ChevronLink
            render=<Link
              to="/$guildId/events/$eventId/heroes/$heroId"
              params={{
                guildId,
                eventId,
                heroId: hero.heroId,
              }}
            />
          >
            {t("events.coordination.actions.openMaps")}
          </ChevronLink>
        }
      />
      <SectionCardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            <HeroAvatar hero={hero} />
            <EventCoordinationPriorityBadge priority={hero.priority} />
            <Badge variant="outline" className="gap-1 text-xs">
              <Timer className="size-3" aria-hidden="true" />
              {t(getCoordinationStatusLabelKey(timerStatus))}
              {timerTime && <span>{timerTime}</span>}
            </Badge>
            <Badge variant="outline" className="gap-1 text-xs">
              <MapPin className="size-3" aria-hidden="true" />
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

          {(canWrite && targetGap) || (canManage && hero.timer) ? (
            <div className="flex flex-wrap gap-2">
              {canWrite && targetGap && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  loading={isAssigning}
                  disabled={!isAssignmentEnabled}
                  icon=<UserPlus className="size-3.5" />
                  onClick={() => onSelfAssign(targetGap.mapId, hero)}
                >
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
                  loading={isClosing}
                  icon=<X className="size-3.5" />
                  onClick={() => onCloseWindow(hero)}
                >
                  {t("events.coordination.actions.close_window")}
                </Button>
              )}
            </div>
          ) : null}
        </div>

        <Progress
          value={coveragePercentage}
          variant={getCoordinationPriorityTone(hero.priority) ?? "default"}
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

  return formatTimeShort(new Date(timeSource));
}

function getGapLabelKey(gapType: "UNASSIGNED" | "UNCOVERED") {
  if (gapType === "UNASSIGNED") {
    return "events.maps.gap.unassigned";
  }

  return "events.maps.gap.uncovered";
}
