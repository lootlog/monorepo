import { cn } from "@/utils/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { format } from "date-fns";
import type { MapGap } from "../../hooks/queries/use-kill-timeline";

interface MapCoverageTimelineProps {
  startTime: Date;
  endTime: Date;
  gaps: MapGap[];
}

interface TimelineSegment {
  type: "COVERED" | "UNCOVERED" | "UNASSIGNED";
  startPercent: number;
  widthPercent: number;
  startTime: Date;
  endTime: Date;
}

function calculateTimelineSegments(
  startTime: Date,
  endTime: Date,
  gaps: MapGap[],
): TimelineSegment[] {
  const totalMs = endTime.getTime() - startTime.getTime();
  if (totalMs <= 0) return [];

  const sortedGaps = [...gaps]
    .filter((g) => {
      const gapStart = new Date(g.startedAt);
      const gapEnd = g.endedAt ? new Date(g.endedAt) : endTime;
      return gapStart < endTime && gapEnd > startTime;
    })
    .sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    );

  const segments: TimelineSegment[] = [];
  let currentTime = startTime.getTime();

  for (const gap of sortedGaps) {
    const gapStart = Math.max(
      new Date(gap.startedAt).getTime(),
      startTime.getTime(),
    );
    const gapEnd = Math.min(
      gap.endedAt ? new Date(gap.endedAt).getTime() : endTime.getTime(),
      endTime.getTime(),
    );

    if (gapStart > currentTime) {
      segments.push({
        type: "COVERED",
        startPercent: ((currentTime - startTime.getTime()) / totalMs) * 100,
        widthPercent: ((gapStart - currentTime) / totalMs) * 100,
        startTime: new Date(currentTime),
        endTime: new Date(gapStart),
      });
    }

    if (gapEnd > gapStart) {
      segments.push({
        type: gap.gapType as "UNCOVERED" | "UNASSIGNED",
        startPercent: ((gapStart - startTime.getTime()) / totalMs) * 100,
        widthPercent: ((gapEnd - gapStart) / totalMs) * 100,
        startTime: new Date(gapStart),
        endTime: new Date(gapEnd),
      });
    }

    currentTime = gapEnd;
  }

  if (currentTime < endTime.getTime()) {
    segments.push({
      type: "COVERED",
      startPercent: ((currentTime - startTime.getTime()) / totalMs) * 100,
      widthPercent: ((endTime.getTime() - currentTime) / totalMs) * 100,
      startTime: new Date(currentTime),
      endTime: endTime,
    });
  }

  return segments;
}

function formatSegmentDuration(segment: TimelineSegment): string {
  const durationMs = segment.endTime.getTime() - segment.startTime.getTime();
  const seconds = Math.floor(durationMs / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
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
                {format(segment.startTime, "HH:mm:ss")} -{" "}
                {format(segment.endTime, "HH:mm:ss")}
              </span>
              <span>{formatSegmentDuration(segment)}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
};
