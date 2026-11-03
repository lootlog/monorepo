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

// The hero name cannot contain brackets, so the pattern cannot backtrack
// across the "[/b]" marker on crafted input.
const HERO_DETECTOR_MESSAGE =
  /^\[b\]([^[\]]+) \((\d+)([a-z]?)\)\[\/b\] (grasuje|pojawi się) w: (.+)$/u;

/** Detector answers are short; longer system messages are something else. */
const MAX_HERO_DETECTOR_MESSAGE_LENGTH = 300;

/**
 * Reads a detector answer such as
 * `[b]Tepeyollotl (258b)[/b] grasuje w: Oztotl Tzacua p.2 - sala 2`.
 * Margonem names the hero and the map but sends no NPC or map id.
 */
export const parseHeroDetectorMessage = (
  message: string,
): HeroDetection | null => {
  if (message.length > MAX_HERO_DETECTOR_MESSAGE_LENGTH) return null;
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

type SightingIdentity = {
  readonly id: number;
  readonly guildId: string;
  readonly world: string;
  readonly hero: { readonly key: string };
};

/**
 * Keeps one sighting per hero in each Organization world: the newest by id.
 * Sighting ids grow with time, so the closed sighting a probable kill
 * replaced never displaces its successor, whatever order updates arrive in.
 * Returns the same array when nothing changes.
 */
export const upsertNewestHeroSighting = <Sighting extends SightingIdentity>(
  sightings: readonly Sighting[],
  next: Sighting,
): readonly Sighting[] => {
  const index = sightings.findIndex(
    (sighting) =>
      sighting.guildId === next.guildId &&
      sighting.world === next.world &&
      sighting.hero.key === next.hero.key,
  );

  if (index === -1) return [...sightings, next];

  const current = sightings[index];

  if (current && current.id > next.id) return sightings;

  return sightings.map((sighting, position) =>
    position === index ? next : sighting,
  );
};

type ClaimedSighting = {
  readonly claims: ReadonlyArray<{
    readonly member: { readonly userId: string | null };
  }>;
};

/** Whether the signed-in User, by internal Lootlog User id, camps the hero. */
export const isHeroSightingClaimedBy = (
  sighting: ClaimedSighting,
  userId: string | undefined,
): boolean =>
  userId !== undefined &&
  sighting.claims.some((claim) => claim.member.userId === userId);

/**
 * A sighting that places the hero now: open and, for a roaming hero,
 * confirmed recently enough to still be believed.
 */
export const isCurrentHeroSighting = (
  sighting: {
    readonly closedAt: string | null;
    readonly state: string;
    readonly lastSeenAt: string;
  },
  now: number,
): boolean => sighting.closedAt === null && !isHeroSightingStale(sighting, now);
