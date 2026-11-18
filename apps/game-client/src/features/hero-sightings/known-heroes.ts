import type { HeroSightingResponseDto } from "@lootlog/client/main";
import { getHeroSightingKey } from "@lootlog/domain/hero-sightings";
import {
  getProfByShortname,
  getShortnameByProf,
} from "@lootlog/domain/profession";
import type { Timer } from "@/api/timers.api";

/** A hero the game client already knows in a world, offered while adding one by hand. */
export type KnownHero = {
  readonly key: string;
  readonly name: string;
  readonly lvl: number;
  /** Margonem profession shortname, when known. */
  readonly prof: string | undefined;
};

/** Timers carry a shortname or a profession name; sightings a profession name. */
const toProfShortname = (prof: string | null | undefined) => {
  if (!prof) return undefined;
  const shortname = prof.toLowerCase();

  return (
    getShortnameByProf(prof.toUpperCase()) ??
    (getProfByShortname(shortname) ? shortname : undefined)
  );
};

/**
 * Every hero named by a loaded sighting or hero timer, once, by name. A
 * sighting wins over a timer: it carries the spelling the server keeps.
 */
export const collectKnownHeroes = (
  sightings: readonly HeroSightingResponseDto[],
  timers: readonly Timer[],
): KnownHero[] => {
  const heroes = new Map<string, KnownHero>();

  const add = ({ name, lvl, prof }: Omit<KnownHero, "key">) => {
    const key = getHeroSightingKey(name);

    if (key && !heroes.has(key)) heroes.set(key, { key, name, lvl, prof });
  };

  for (const { hero } of sightings)
    add({ name: hero.name, lvl: hero.lvl, prof: toProfShortname(hero.prof) });

  for (const { npc } of timers) {
    if (npc.type !== "HERO" || !npc.name) continue;
    add({ name: npc.name, lvl: npc.lvl, prof: toProfShortname(npc.prof) });
  }

  return [...heroes.values()].toSorted((a, b) =>
    a.name.localeCompare(b.name, "pl"),
  );
};

const MAX_SUGGESTED_HEROES = 8;

/** Known heroes whose name contains what the player typed so far. */
export const suggestKnownHeroes = (
  heroes: readonly KnownHero[],
  typedName: string,
): KnownHero[] => {
  const query = typedName.trim().toLocaleLowerCase("pl");

  if (!query) return [];

  return heroes
    .filter((hero) => hero.name.toLocaleLowerCase("pl").includes(query))
    .slice(0, MAX_SUGGESTED_HEROES);
};
