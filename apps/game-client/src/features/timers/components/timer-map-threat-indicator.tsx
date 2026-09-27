import { useTranslation } from "react-i18next";
import type { MapThreat } from "@/lib/map-threat-source";
import { TimerMapPlayersBadge } from "./timer-map-players-badge";

export function TimerMapThreatIndicator({
  threat,
  decorative = false,
}: {
  threat: MapThreat;
  decorative?: boolean;
}) {
  const { t } = useTranslation("timers");
  const fresh = threat.freshCount > 0;
  const count = fresh ? threat.freshCount : threat.enemies.length;

  // Fresh sightings sort first, so they are the leading `freshCount` enemies.
  const active = threat.enemies
    .slice(0, threat.freshCount)
    .some((enemy) => !enemy.stasis);

  return (
    <TimerMapPlayersBadge
      tone="enemy"
      count={count}
      active={active}
      stale={!fresh}
      label={
        decorative
          ? undefined
          : t(fresh ? "tooltip.mapThreat" : "tooltip.mapThreatStale", {
              count,
            })
      }
    />
  );
}
