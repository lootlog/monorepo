import { useTranslation } from "react-i18next";
import type { MapOccupancy } from "@/lib/presence-map-index";
import { TimerMapPlayersBadge } from "./timer-map-players-badge";

export function TimerMapPresenceIndicator({
  occupancy,
  decorative = false,
}: {
  occupancy: MapOccupancy;
  decorative?: boolean;
}) {
  const { t } = useTranslation("timers");
  const count = occupancy.players.length;

  return (
    <TimerMapPlayersBadge
      tone="ally"
      count={count}
      active={!occupancy.allAfk}
      label={
        decorative
          ? undefined
          : t(occupancy.allAfk ? "tooltip.mapAfk" : "tooltip.mapOccupied", {
              count,
            })
      }
    />
  );
}
