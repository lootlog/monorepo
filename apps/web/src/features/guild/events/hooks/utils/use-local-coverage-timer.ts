import { useState, useEffect, useRef } from "react";
import { formatDurationPadded } from "../../utils";

export type CoverageGapType = "UNASSIGNED" | "UNCOVERED";

export type MapStatus =
  | "ASSIGNED_PRESENT"
  | "ASSIGNED_ABSENT"
  | "ASSIGNED_AFK"
  | "UNASSIGNED";

export const getGapTypeFromStatus = (
  status: MapStatus,
): CoverageGapType | null => {
  if (status === "ASSIGNED_PRESENT") return null;
  if (status === "UNASSIGNED") return "UNASSIGNED";
  return "UNCOVERED";
};

export const useLocalCoverageTimer = (
  status: MapStatus,
  initialStartedAt?: Date | null,
) => {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const prevGapTypeRef = useRef<CoverageGapType | null>(null);
  const initializedRef = useRef(false);
  const usedBackendValueRef = useRef(false);

  const gapType = getGapTypeFromStatus(status);

  useEffect(() => {
    const prevGapType = prevGapTypeRef.current;
    prevGapTypeRef.current = gapType;

    if (gapType === null) {
      setStartTime(null);
      setElapsedSeconds(0);
      initializedRef.current = false;
      usedBackendValueRef.current = false;
    } else if (gapType !== prevGapType && prevGapType !== null) {
      setStartTime(Date.now());
      setElapsedSeconds(0);
      usedBackendValueRef.current = true;
    } else if (!initializedRef.current) {
      initializedRef.current = true;
      if (initialStartedAt) {
        setStartTime(initialStartedAt.getTime());
        usedBackendValueRef.current = true;
      } else {
        setStartTime(Date.now());
      }
    } else if (initialStartedAt && !usedBackendValueRef.current) {
      setStartTime(initialStartedAt.getTime());
      usedBackendValueRef.current = true;
    }
  }, [gapType, initialStartedAt]);

  useEffect(() => {
    if (startTime === null) return;

    const updateElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    };

    updateElapsed();

    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return {
    gapType,
    elapsedSeconds,
    formattedDuration: gapType ? formatDurationPadded(elapsedSeconds) : null,
  };
};
