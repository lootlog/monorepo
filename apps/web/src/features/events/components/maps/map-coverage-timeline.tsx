import { cn } from "@/utils/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import type { MapGap } from "../../hooks/queries/use-kill-timeline";
import {
  calculateTimelineSegments,
  formatDurationFromMs,
  formatTime,
} from "../../utils";

interface MapCoverageTimelineProps {
  startTime: Date;
  endTime: Date;
  gaps: MapGap[];
}

export const MapCoverageTimeline = ({
  startTime,
  endTime,
  gaps,
}: MapCoverageTimelineProps) => {
  const segments = calculateTimelineSegments(startTime, endTime, gaps);

  if (segments.length === 0) {
    return (
      <div className="relative h-3 w-full rounded-full bg-green-500 overflow-hidden" />
    );
  }

  return (
    <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden">
      {segments.map((segment, index) => (
        <Tooltip key={index}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "absolute h-full cursor-pointer transition-opacity hover:opacity-80",
                segment.type === "COVERED" && "bg-green-500",
                segment.type === "UNCOVERED" && "bg-yellow-500",
                segment.type === "UNASSIGNED" && "bg-destructive",
              )}
              style={{
                left: `${segment.startPercent}%`,
                width: `${Math.max(segment.widthPercent, 0.5)}%`,
              }}
            />
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">
                {segment.type === "COVERED"
                  ? "Pokryte"
                  : segment.type === "UNCOVERED"
                    ? "Nieobstawione"
                    : "Nieprzypisane"}
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
