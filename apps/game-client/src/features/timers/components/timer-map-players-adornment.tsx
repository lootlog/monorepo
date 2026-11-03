import type { MapThreat } from "@/lib/map-threat-source";
import type { MapOccupancy } from "@/lib/presence-map-index";
import { TimerMapPresenceIndicator } from "./timer-map-presence-indicator";
import { TimerMapThreatIndicator } from "./timer-map-threat-indicator";
import { TimerHeroSightingIndicator } from "./timer-hero-sighting-indicator";
import type { TimerHeroSighting } from "./timer-map-presence-provider";

/** The detected hero mark and member and enemy counts shown before a timer's time. */
export function TimerMapPlayersAdornment({
  occupancy,
  threat,
  heroSighting,
}: {
  occupancy: MapOccupancy | undefined;
  threat: MapThreat | undefined;
  heroSighting?: TimerHeroSighting;
}) {
  if (!occupancy && !threat && !heroSighting) return null;

  return (
    <span className="ll:mr-[0.3em] ll:inline-flex ll:items-baseline ll:gap-[0.3em]">
      {heroSighting && (
        <TimerHeroSightingIndicator
          sighting={heroSighting.sighting}
          unconfirmed={heroSighting.unconfirmed}
        />
      )}
      {occupancy && <TimerMapPresenceIndicator occupancy={occupancy} />}
      {threat && <TimerMapThreatIndicator threat={threat} />}
      <span aria-hidden="true" className="ll:text-white/35">
        ·
      </span>
    </span>
  );
}
