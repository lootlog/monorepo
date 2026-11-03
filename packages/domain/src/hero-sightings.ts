import { getProfByShortname } from "./profession.js";
import { normalizeNpcName } from "@lootlog/schema/npc-identity";
import {
  HeroSightingState,
  type HeroSightingState as HeroSightingStateValue,
} from "@lootlog/schema/hero-sightings";
import type { ProfessionEnum } from "@lootlog/schema/loot";

/** Sightings kept per hero in one Organization world, the current one included. */
export const HERO_SIGHTING_HISTORY_LIMIT = 20;

/**
 * A roaming hero not confirmed for this long may already be dead. Its
 * sighting stays current until a detection contradicts it, but surfaces show
 * it as unconfirmed instead of as the hero's position.
 */
export const HERO_SIGHTING_STALE_AFTER_MS = 30 * 60 * 1000;

/** The system chat style Margonem uses for a detector answer. */
export const HERO_DETECTOR_CHAT_STYLE = 4;

export type HeroDetection = {
  readonly heroName: string;
  readonly heroLvl: number;
  readonly heroProf: ProfessionEnum | null;
  readonly state: HeroSightingStateValue;
  readonly mapName: string;
};

const HERO_DETECTOR_MESSAGE =
  /^\[b\](.+?) \((\d+)([a-z]?)\)\[\/b\] (grasuje|pojawi się) w: (.+)$/u;

/**
 * Reads a detector answer such as
 * `[b]Tepeyollotl (258b)[/b] grasuje w: Oztotl Tzacua p.2 - sala 2`.
 * Margonem names the hero and the map but sends no NPC or map id.
 */
export const parseHeroDetectorMessage = (
  message: string,
): HeroDetection | null => {
  const match = HERO_DETECTOR_MESSAGE.exec(message.trim());

  if (!match) return null;
  const [, heroName = "", lvl = "", prof = "", verb, mapName = ""] = match;

  return {
    heroName: heroName.trim(),
    heroLvl: Number(lvl),
    heroProf: getProfByShortname(prof) ?? null,
    state:
      verb === "grasuje"
        ? HeroSightingState.ROAMING
        : HeroSightingState.SPAWNING,
    mapName: mapName.trim(),
  };
};

/** Heroes have no stable id in a detector answer; one world has one hero per name. */
export const getHeroSightingKey = (heroName: string): string =>
  normalizeNpcName(heroName);

export type HeroSightingObservation = {
  readonly state: HeroSightingStateValue;
  readonly mapName: string;
  readonly observedAt: number;
};

export type CurrentHeroSighting = {
  readonly state: HeroSightingStateValue;
  readonly mapName: string;
  readonly lastSeenAt: number;
};

/**
 * - `OPEN`: no current sighting; the detection starts one.
 * - `CONFIRM`: the detection repeats the current sighting.
 * - `SPAWNED`: the hero appeared where its spawn was detected; the sighting,
 *   with its claims, becomes a roaming one.
 * - `REPLACE`: the detection contradicts the current sighting, so the hero
 *   was probably killed; a new sighting replaces it.
 * - `STALE`: an older detection that disagrees with newer knowledge.
 */
export type HeroSightingTransition =
  | "OPEN"
  | "CONFIRM"
  | "SPAWNED"
  | "REPLACE"
  | "STALE";

/**
 * Detections from several players arrive in any order, so they are compared
 * by the time Margonem answered, not by arrival.
 *
 * A hero killed and respawned on the same map between two detections that
 * both say "pojawi się" is indistinguishable from one pending spawn; that
 * kill is not inferred.
 */
export const resolveHeroSightingTransition = (
  current: CurrentHeroSighting | null,
  observation: HeroSightingObservation,
): HeroSightingTransition => {
  if (!current) return "OPEN";
  const sameMap = current.mapName === observation.mapName;

  if (sameMap && current.state === observation.state) return "CONFIRM";

  if (observation.observedAt < current.lastSeenAt) return "STALE";

  if (
    sameMap &&
    current.state === HeroSightingState.SPAWNING &&
    observation.state === HeroSightingState.ROAMING
  )
    return "SPAWNED";

  return "REPLACE";
};

export const isHeroSightingStale = (
  sighting: { readonly state: string; readonly lastSeenAt: string },
  now: number,
): boolean =>
  sighting.state === HeroSightingState.ROAMING &&
  now - Date.parse(sighting.lastSeenAt) > HERO_SIGHTING_STALE_AFTER_MS;
