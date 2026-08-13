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

const secondTickListeners = new Set<(currentSecond: number) => void>();
let secondTickInterval: ReturnType<typeof setInterval> | null = null;

export const getCoverageClockSecond = () => Math.floor(Date.now() / 1000);
export const subscribeToCoverageClock = (
  listener: (currentSecond: number) => void,
) => {
  secondTickListeners.add(listener);

  if (secondTickInterval === null) {
    secondTickInterval = setInterval(() => {
      const currentSecond = getCoverageClockSecond();
      [...secondTickListeners].forEach((currentListener) =>
        currentListener(currentSecond),
      );
    }, 1000);
  }

  return () => {
    secondTickListeners.delete(listener);

    if (secondTickListeners.size === 0 && secondTickInterval !== null) {
      clearInterval(secondTickInterval);
      secondTickInterval = null;
    }
  };
};

export const useLocalCoverageTimer = (
  status: MapStatus,
  activeGap?: Pick<CoverageGap, "gapType" | "id" | "startedAt"> | null,
) => {
  const [startTime, setStartTime] = useState<number | null>(null);
  const prevGapTypeRef = useRef<CoverageGapType | null>(null);
  const ignoredGapIdRef = useRef<string | null>(null);

  const statusGapType = getGapTypeFromStatus(status);
  const activeGapId = activeGap?.id ?? null;
  const activeGapType = activeGap?.gapType ?? null;
  const activeGapStartedAt = activeGap?.startedAt ?? null;
  const fallbackGapType =
    activeGapId !== ignoredGapIdRef.current ? activeGapType : null;
  const gapType =
    statusGapType ?? (status === "ASSIGNED_UNKNOWN" ? fallbackGapType : null);

  useEffect(() => {
    const prevGapType = prevGapTypeRef.current;
    prevGapTypeRef.current = gapType;

    if (gapType === null) {
      if (activeGapId) {
        ignoredGapIdRef.current = activeGapId;
      }
      setStartTime(null);
      return;
    }

    const hasCurrentBackendGap =
      activeGapId !== null &&
      activeGapId !== ignoredGapIdRef.current &&
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
  }, [activeGapId, activeGapStartedAt, activeGapType, gapType]);

  const elapsedSeconds =
    startTime === null
      ? 0
      : Math.max(0, getCoverageClockSecond() - Math.floor(startTime / 1000));

  return {
    gapType,
    elapsedSeconds,
    formattedDuration: gapType ? formatDurationPadded(elapsedSeconds) : null,
    startTime,
  };
};
