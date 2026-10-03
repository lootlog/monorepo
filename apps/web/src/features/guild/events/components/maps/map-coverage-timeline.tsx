import { cn } from "cn";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import type { TFunction } from "i18next";
import { formatTime } from "../../utils/format-date";
import { COVERAGE_SEGMENT_BG_CLASS_NAMES } from "../../utils/get-map-coverage-color-class-name";
import { formatDurationFromMs } from "../../utils/format-duration";
import { calculateTimelineSegments } from "../../utils/timeline-segments";
import type { MapGap } from "../../types/api";

interface MapCoverageTimelineProps {
  startTime: Date;
  endTime: Date;
  gaps: MapGap[];
  t: TFunction;
}

export const MapCoverageTimeline = ({
  startTime,
  endTime,
  gaps,
  t,
}: MapCoverageTimelineProps) => {
  const segments = calculateTimelineSegments(startTime, endTime, gaps);

  if (segments.length === 0) {
    return (
      <div
        className={cn(
          "relative h-3 w-full overflow-hidden rounded-full",
          COVERAGE_SEGMENT_BG_CLASS_NAMES.COVERED,
        )}
      />
    );
  }

  return (
    <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
      {segments.map((segment) => (
        <Tooltip
          key={`${segment.type}-${segment.startTime.toISOString()}-${segment.endTime.toISOString()}`}
        >
          <TooltipTrigger
            render=<div
              className={cn(
                "absolute h-full cursor-pointer transition-opacity hover:opacity-80",
                COVERAGE_SEGMENT_BG_CLASS_NAMES[segment.type],
              )}
              style={{
                left: `${segment.startPercent}%`,
                width: `${Math.max(segment.widthPercent, 0.5)}%`,
              }}
            />
          />
          <TooltipContent side="top" className="text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">
                {segment.type === "COVERED"
                  ? t("events.killDetail.mapCoverage.covered")
                  : segment.type === "UNCOVERED"
                    ? t("events.killDetail.mapCoverage.uncovered")
                    : t("events.killDetail.mapCoverage.unassigned")}
              </span>
              <span className="text-muted-foreground">
                {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
              </span>
              <span>
                {formatDurationFromMs(
                  segment.endTime.getTime() - segment.startTime.getTime(),
                )}
              </span>
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};
