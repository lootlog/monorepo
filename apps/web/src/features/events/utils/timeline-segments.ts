export interface TimelineGap {
  gapType: "UNASSIGNED" | "UNCOVERED";
  startedAt: string;
  endedAt: string | null;
}

export interface TimelineSegment {
  type: "COVERED" | "UNCOVERED" | "UNASSIGNED";
  startPercent: number;
  widthPercent: number;
  startTime: Date;
  endTime: Date;
}

export const calculateTimelineSegments = (
  startTime: Date,
  endTime: Date,
  gaps: TimelineGap[],
): TimelineSegment[] => {
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
        type: gap.gapType,
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
};
