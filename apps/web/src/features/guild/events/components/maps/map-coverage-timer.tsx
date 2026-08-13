import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Clock } from "lucide-react";
import { cn } from "@lootlog/ui/lib/utils";
import type { CoverageGap } from "../../hooks/queries/use-map-coverage-timer";
import type { WindowStatus } from "../../hooks/use-window-status";
import { isWindowActive } from "../../hooks/use-window-status";
import {
  getCoverageClockSecond,
  subscribeToCoverageClock,
  useLocalCoverageTimer,
} from "../../hooks/utils/use-local-coverage-timer";
import { formatDurationPadded } from "../../utils/format-duration";
import type { MapStatus } from "./map-card";

interface MapCoverageTimerProps {
  mapId: string;
  status: MapStatus;
  activeGap?: CoverageGap | null;
  windowStatus: WindowStatus;
}

export const MapCoverageTimer = ({
  mapId,
  status,
  activeGap,
  windowStatus,
}: MapCoverageTimerProps) => {
  const { t } = useTranslation();
  const timerContainerRef = useRef<HTMLSpanElement>(null);
  const timerValueRef = useRef<HTMLSpanElement>(null);

  const { gapType, formattedDuration, startTime } = useLocalCoverageTimer(
    status,
    activeGap,
  );
  const isUnassigned = gapType === "UNASSIGNED";
  const tooltipContent = isUnassigned
    ? t("events.maps.gap.unassignedTooltip")
    : t("events.maps.gap.uncoveredTooltip");
  const isTimerVisible =
    isWindowActive(windowStatus) &&
    gapType !== null &&
    formattedDuration !== null;

  useEffect(() => {
    if (!isTimerVisible || startTime === null) return;

    const updateTimerValue = (currentSecond: number) => {
      const elapsedSeconds = Math.max(
        0,
        currentSecond - Math.floor(startTime / 1000),
      );
      const nextDuration = formatDurationPadded(elapsedSeconds);

      if (timerValueRef.current) {
        timerValueRef.current.textContent = nextDuration;
      }
      timerContainerRef.current?.setAttribute(
        "aria-label",
        `${tooltipContent}: ${nextDuration}`,
      );
    };

    updateTimerValue(getCoverageClockSecond());
    return subscribeToCoverageClock(updateTimerValue);
  }, [isTimerVisible, startTime, tooltipContent]);

  if (!isTimerVisible) {
    return null;
  }

  return (
    <span
      ref={timerContainerRef}
      className="flex shrink-0 cursor-help items-center gap-1"
      data-map-coverage-timer={mapId}
      title={tooltipContent}
      aria-label={`${tooltipContent}: ${formattedDuration}`}
    >
      <Clock
        className={cn(
          "size-3",
          isUnassigned ? "text-destructive" : "text-yellow-500",
        )}
      />
      <span
        ref={timerValueRef}
        className={cn(
          "font-mono text-xs",
          isUnassigned ? "text-destructive" : "text-yellow-500",
        )}
      >
        {formattedDuration}
      </span>
    </span>
  );
};
