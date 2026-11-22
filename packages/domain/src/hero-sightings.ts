import { getProfByShortname, getShortnameByProf } from "./profession.js";
import { normalizeNpcName } from "@lootlog/schema/npc-identity";
import {
  HeroSightingState,
  type HeroSightingState as HeroSightingStateValue,
} from "@lootlog/schema/hero-sightings";
import type { ProfessionEnum } from "@lootlog/schema/loot";
import { comparePolish } from "./locale.js";
import { normalizeSearchText } from "./text-fold.js";

export const HERO_SIGHTING_HISTORY_LIMIT = 20;

export const HERO_SIGHTING_STALE_AFTER_MS = 30 * 60 * 1000;

export const HERO_DETECTOR_CHAT_STYLE = 4;

export type HeroDetection = {
  readonly heroName: string;
  readonly heroLvl: number;
  readonly heroProf: ProfessionEnum | null;
  readonly state: HeroSightingStateValue;
  readonly mapName: string;
};

const HERO_DETECTOR_STATES = new Map<string, HeroSightingStateValue>([
  ["grasuje w", HeroSightingState.ROAMING],
  ["pojawi się w", HeroSightingState.SPAWNING],
  ["roves in", HeroSightingState.ROAMING],
  ["will appear in", HeroSightingState.SPAWNING],
]);

const HERO_DETECTOR_MESSAGE =
  /^(?:\[b\])?([^[\]]+?) \((\d+)([a-z]?)\)(?:\[\/b\])? (grasuje w|pojawi się w|roves in|will appear in): (.+)$/u;

const MAX_HERO_DETECTOR_MESSAGE_LENGTH = 300;

export const parseHeroDetectorMessage = (
  message: string,
): HeroDetection | null => {
  if (message.length > MAX_HERO_DETECTOR_MESSAGE_LENGTH) return null;
  const match = HERO_DETECTOR_MESSAGE.exec(message.trim());

  if (!match) return null;

  const [, heroName = "", lvl = "", prof = "", verb = "", mapName = ""] = match;
  const state = HERO_DETECTOR_STATES.get(verb);

  if (!state) return null;

  return {
    heroName: heroName.trim(),
    heroLvl: Number(lvl),
    heroProf: getProfByShortname(prof) ?? null,
    state,
    mapName: mapName.trim(),
  };
};

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

export type HeroSightingTransition =
  | "OPEN"
  | "CONFIRM"
  | "SPAWNED"
  | "REPLACE"
  | "STALE";

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

export const isHeroSightingClaimedBy = (
  sighting: ClaimedSighting,
  userId: string | undefined,
): boolean =>
  userId !== undefined &&
  sighting.claims.some((claim) => claim.member.userId === userId);

export const isHeroSightingClaimable = (sighting: {
  readonly closedAt: string | null;
  readonly state: string;
}): boolean =>
  sighting.closedAt === null && sighting.state === HeroSightingState.SPAWNING;

export const isCurrentHeroSighting = (
  sighting: {
    readonly closedAt: string | null;
    readonly state: string;
    readonly lastSeenAt: string;
  },
  now: number,
): boolean => sighting.closedAt === null && !isHeroSightingStale(sighting, now);

export type KnownHero = {
  readonly key: string;
  readonly name: string;
  readonly lvl: number;
  readonly prof: string | undefined;
};

type NamedHero = {
  readonly name: string;
  readonly lvl: number;
  readonly prof: string | null | undefined;
};

const toProfShortname = (prof: string | null | undefined) => {
  if (!prof) return undefined;
  const shortname = prof.toLowerCase();

  return (
    getShortnameByProf(prof.toUpperCase()) ??
    (getProfByShortname(shortname) ? shortname : undefined)
  );
};

export const collectKnownHeroes = (
  sightings: readonly { readonly hero: NamedHero }[],
  timers: readonly { readonly npc: NamedHero & { readonly type: string } }[],
): KnownHero[] => {
  const heroes = new Map<string, KnownHero>();

  const add = ({ name, lvl, prof }: NamedHero) => {
    const key = getHeroSightingKey(name);

    if (key && !heroes.has(key))
      heroes.set(key, { key, name, lvl, prof: toProfShortname(prof) });
  };

  for (const { hero } of sightings) add(hero);

  for (const { npc } of timers) if (npc.type === "HERO" && npc.name) add(npc);

  return [...heroes.values()].sort((a, b) => comparePolish(a.name, b.name));
};

const MAX_SUGGESTED_HEROES = 8;

export const suggestKnownHeroes = (
  heroes: readonly KnownHero[],
  typedName: string,
): KnownHero[] => {
  const query = normalizeSearchText(typedName);

  if (!query) return [];

  return heroes
    .filter((hero) => normalizeSearchText(hero.name).includes(query))
    .slice(0, MAX_SUGGESTED_HEROES);
};
