import { getClockSecond } from "@/hooks/utils/second-clock";
import { useEffect, useRef, useState } from "react";
import { formatDurationPadded } from "../../utils/format-duration";
import type { CoverageGap } from "../queries/use-map-coverage-timer";

export type CoverageGapType = "UNASSIGNED" | "UNCOVERED";

export type MapStatus =
  | "ASSIGNED_PRESENT"
  | "ASSIGNED_ABSENT"
  | "ASSIGNED_AFK"
  | "ASSIGNED_UNKNOWN"
  | "UNASSIGNED";

const getGapTypeFromStatus = (status: MapStatus): CoverageGapType | null => {
  if (status === "ASSIGNED_PRESENT") return null;
  if (status === "ASSIGNED_UNKNOWN") return null;
  if (status === "UNASSIGNED") return "UNASSIGNED";
  return "UNCOVERED";
};

export const useLocalCoverageTimer = (
  status: MapStatus,
  activeGap?: Pick<CoverageGap, "gapType" | "id" | "startedAt"> | null,
) => {
  const [startTime, setStartTime] = useState<number | null>(null);
  const prevGapTypeRef = useRef<CoverageGapType | null>(null);
  const [ignoredGapId, setIgnoredGapId] = useState<string | null>(null);

  const statusGapType = getGapTypeFromStatus(status);
  const activeGapId = activeGap?.id ?? null;
  const activeGapType = activeGap?.gapType ?? null;
  const activeGapStartedAt = activeGap?.startedAt ?? null;
  const fallbackGapType = activeGapId !== ignoredGapId ? activeGapType : null;
  const gapType =
    statusGapType ?? (status === "ASSIGNED_UNKNOWN" ? fallbackGapType : null);

  // Captures the wall-clock start of a local transition and records closed backend gap IDs; this history is not derivable from the current snapshot.
  // eslint-disable-next-line react-doctor/no-derived-state-effect
  useEffect(() => {
    const prevGapType = prevGapTypeRef.current;
    prevGapTypeRef.current = gapType;

    if (gapType === null) {
      if (activeGapId) {
        // Remember a closed backend gap until its stale snapshot disappears; current props cannot reconstruct this history.
        // eslint-disable-next-line react-doctor/no-derived-state
        setIgnoredGapId(activeGapId);
      }
      // The local elapsed clock ends on a coverage transition, independently of a lagging backend gap.
      // eslint-disable-next-line react-doctor/no-adjust-state-on-prop-change
      setStartTime(null);
      return;
    }

    const hasCurrentBackendGap =
      activeGapId !== null &&
      activeGapId !== ignoredGapId &&
      activeGapType === gapType &&
      activeGapStartedAt !== null;

    if (hasCurrentBackendGap) {
      const backendStartTime = Date.parse(activeGapStartedAt);
      if (!Number.isNaN(backendStartTime)) {
        setStartTime(backendStartTime);
        return;
      }
    }

    if (prevGapType === null || prevGapType !== gapType) {
      setStartTime(Date.now());
    }
  }, [activeGapId, activeGapStartedAt, activeGapType, gapType, ignoredGapId]);

  const elapsedSeconds =
    startTime === null
      ? 0
      : Math.max(0, getClockSecond() - Math.floor(startTime / 1000));

  return {
    gapType,
    elapsedSeconds,
    formattedDuration: gapType ? formatDurationPadded(elapsedSeconds) : null,
    startTime,
  };
};
