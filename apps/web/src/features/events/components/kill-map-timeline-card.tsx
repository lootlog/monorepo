import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@lootlog/ui/components/accordion";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lootlog/ui/components/avatar";
import { Badge } from "@lootlog/ui/components/badge";
import { format } from "date-fns";
import { MapCoverageTimeline } from "./map-coverage-timeline";
import { getDiscordAvatarUrl } from "@/utils/get-avatar-url";
import { cn } from "@/utils/cn";
import { formatDuration } from "../hooks/utils/use-local-coverage-timer";
import type { MapTimelineData } from "../hooks/queries/use-kill-timeline";
import type { TFunction } from "i18next";

interface KillMapTimelineCardProps {
  map: MapTimelineData;
  startTime: Date;
  endTime: Date;
  t: TFunction;
}

export const KillMapTimelineCard = ({
  map,
  startTime,
  endTime,
  t,
}: KillMapTimelineCardProps) => {
  const hasGaps = map.gaps.length > 0;
  const totalGapSeconds = map.gaps.reduce(
    (sum, g) => sum + (g.durationSeconds ?? 0),
    0,
  );

  // Calculate coverage percentage
  const totalSeconds = Math.round(
    (endTime.getTime() - startTime.getTime()) / 1000,
  );
  const coveragePercent =
    totalSeconds > 0
      ? Math.round(((totalSeconds - totalGapSeconds) / totalSeconds) * 100)
      : 100;

  return (
    <AccordionItem
      value={map.mapId}
      className="border rounded-lg mb-2 bg-card/30"
    >
      <AccordionTrigger className="px-3 py-2 hover:no-underline">
        <div className="flex items-center justify-between w-full pr-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{map.mapName}</span>
            <span className="text-[10px] text-muted-foreground font-mono">
              #{map.numericMapId}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {map.assignments.length > 0 && (
              <div className="flex -space-x-1.5">
                {map.assignments.slice(0, 3).map((a) => (
                  <Avatar
                    key={a.memberId}
                    className="w-5 h-5 border border-background"
                  >
                    <AvatarImage
                      src={getDiscordAvatarUrl(a.memberUserId, a.memberAvatar, 32)}
                    />
                    <AvatarFallback className="text-[8px]">
                      {a.memberName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {map.assignments.length > 3 && (
                  <div className="w-5 h-5 rounded-full bg-muted border border-background flex items-center justify-center text-[8px] text-muted-foreground">
                    +{map.assignments.length - 3}
                  </div>
                )}
              </div>
            )}
            <Badge
              variant={coveragePercent === 100 ? "default" : "secondary"}
              className={cn(
                "text-[10px] px-1.5 py-0",
                coveragePercent === 100 && "bg-green-500/20 text-green-500",
                coveragePercent < 100 &&
                  coveragePercent >= 80 &&
                  "bg-yellow-500/20 text-yellow-500",
                coveragePercent < 80 && "bg-destructive/20 text-destructive",
              )}
            >
              {coveragePercent}%
            </Badge>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-3 pb-3">
        {/* Timeline */}
        <div className="mb-3">
          <MapCoverageTimeline
            startTime={startTime}
            endTime={endTime}
            gaps={map.gaps}
          />
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>{format(startTime, "HH:mm:ss")}</span>
            <span>{format(endTime, "HH:mm:ss")}</span>
          </div>
        </div>

        {/* Assigned Members */}
        {map.assignments.length > 0 && (
          <div className="space-y-1.5 mb-3">
            <p className="text-xs font-medium text-muted-foreground">
              {t("events.killDetail.mapCoverage.assignedMembers")}
            </p>
            {map.assignments.map((assignment) => (
              <div
                key={`${assignment.memberId}-${assignment.assignedAt}`}
                className="flex items-center gap-2 text-sm"
              >
                <Avatar className="w-5 h-5">
                  <AvatarImage
                    src={getDiscordAvatarUrl(
                      assignment.memberUserId,
                      assignment.memberAvatar,
                      32,
                    )}
                  />
                  <AvatarFallback className="text-[8px]">
                    {assignment.memberName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">{assignment.memberName}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {format(new Date(assignment.assignedAt), "HH:mm")}
                  {assignment.unassignedAt &&
                    ` - ${format(new Date(assignment.unassignedAt), "HH:mm")}`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Gap Details */}
        {hasGaps && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {t("events.killDetail.mapCoverage.gapDetails")}
            </p>
            {map.gaps.map((gap) => (
              <div
                key={gap.id}
                className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/30"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full",
                      gap.gapType === "UNASSIGNED"
                        ? "bg-destructive"
                        : "bg-yellow-500",
                    )}
                  />
                  <span>
                    {gap.gapType === "UNASSIGNED"
                      ? t("events.maps.gap.unassigned")
                      : t("events.maps.gap.uncovered")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-[10px]">
                    {format(new Date(gap.startedAt), "HH:mm:ss")}
                    {gap.endedAt &&
                      ` - ${format(new Date(gap.endedAt), "HH:mm:ss")}`}
                  </span>
                  <span className="font-mono font-medium">
                    {formatDuration(gap.durationSeconds ?? 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No gaps message */}
        {!hasGaps && map.assignments.length > 0 && (
          <div className="text-xs text-green-500 text-center py-2">
            {t("events.killDetail.mapCoverage.fullCoverage")}
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
};
