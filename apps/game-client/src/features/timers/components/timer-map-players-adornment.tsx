import type { MapThreat } from "@/lib/map-threat-source";
import type { MapOccupancy } from "@/lib/presence-map-index";
import { TimerMapPresenceIndicator } from "./timer-map-presence-indicator";
import { TimerMapThreatIndicator } from "./timer-map-threat-indicator";

/** Member and enemy counts shown before a timer's time. */
export function TimerMapPlayersAdornment({
  occupancy,
  threat,
}: {
  occupancy: MapOccupancy | undefined;
  threat: MapThreat | undefined;
}) {
  if (!occupancy && !threat) return null;

  return (
    <span className="ll:mr-[0.3em] ll:inline-flex ll:gap-[0.3em]">
      {occupancy && <TimerMapPresenceIndicator occupancy={occupancy} />}
      {threat && <TimerMapThreatIndicator threat={threat} />}
      <span aria-hidden="true" className="ll:text-white/35">
        ·
      </span>
    </span>
  );
}
