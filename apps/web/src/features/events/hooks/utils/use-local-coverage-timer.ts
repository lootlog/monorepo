import { useState, useEffect, useMemo, useRef } from "react";

export type CoverageGapType = "UNASSIGNED" | "UNCOVERED";

export type MapStatus =
  | "ASSIGNED_PRESENT"
  | "ASSIGNED_ABSENT"
  | "ASSIGNED_AFK"
  | "UNASSIGNED";

/**
 * Format seconds to HH:MM:SS
 */
export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

/**
 * Hook for coverage timer based on real-time map status with backend persistence.
 *
 * Timer logic:
 * - ASSIGNED_PRESENT (green): No timer - map is actively covered
 * - ASSIGNED_AFK (orange): UNCOVERED timer - player is AFK
 * - ASSIGNED_ABSENT (yellow): UNCOVERED timer - no one on map
 * - UNASSIGNED (red): UNASSIGNED timer - no one assigned
 *
 * Behavior:
 * - On page refresh: Timer continues from backend `initialStartedAt` value
 * - On real-time status change: Timer reacts immediately
 * - On gap type change (e.g., UNASSIGNED -> UNCOVERED): Timer resets to 0:00:00
 */
export const useLocalCoverageTimer = (
  status: MapStatus,
  initialStartedAt?: Date | null,
) => {
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const prevGapTypeRef = useRef<CoverageGapType | null>(null);
  const initializedRef = useRef(false);
  const usedBackendValueRef = useRef(false);

  // Determine gap type based on status
  const gapType = useMemo((): CoverageGapType | null => {
    if (status === "ASSIGNED_PRESENT") return null;
    if (status === "UNASSIGNED") return "UNASSIGNED";
    return "UNCOVERED"; // ASSIGNED_AFK or ASSIGNED_ABSENT
  }, [status]);

  // Initialize/reset timer when gap type changes
  useEffect(() => {
    const prevGapType = prevGapTypeRef.current;
    prevGapTypeRef.current = gapType;

    if (gapType === null) {
      // No gap - stop timer
      setStartTime(null);
      setElapsedSeconds(0);
      initializedRef.current = false;
      usedBackendValueRef.current = false;
    } else if (gapType !== prevGapType && prevGapType !== null) {
      // Gap type CHANGED (not initial mount) - reset timer to now
      setStartTime(Date.now());
      setElapsedSeconds(0);
      usedBackendValueRef.current = true; // Mark as user-initiated, don't override with backend
    } else if (!initializedRef.current) {
      // First time with this gap type - use backend value if available
      initializedRef.current = true;
      if (initialStartedAt) {
        setStartTime(initialStartedAt.getTime());
        usedBackendValueRef.current = true;
      } else {
        // No backend value yet - start from now, but allow backend value to override later
        setStartTime(Date.now());
      }
    } else if (initialStartedAt && !usedBackendValueRef.current) {
      // Backend value arrived after initial mount - use it
      setStartTime(initialStartedAt.getTime());
      usedBackendValueRef.current = true;
    }
  }, [gapType, initialStartedAt]);

  // Update elapsed every second
  useEffect(() => {
    if (startTime === null) return;

    const updateElapsed = () => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    };

    // Initial update
    updateElapsed();

    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  return {
    gapType,
    elapsedSeconds,
    formattedDuration: gapType ? formatDuration(elapsedSeconds) : null,
  };
};
