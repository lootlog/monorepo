import type {
  HeroSightingResponseDto,
  TimerResponseDto,
} from "@lootlog/client/main";
import { getHeroSightingKey } from "@lootlog/domain/hero-sightings";
import { getShortnameByProf } from "@lootlog/domain/profession";
import { sortBy } from "es-toolkit";

/** A hero the Organization already met, as the add form suggests it. */
export type KnownHero = {
  key: string;
  name: string;
  lvl: number;
  /** Margonem profession shortname, as the API takes it. */
  prof: string | undefined;
};

const toShortname = (prof: string | null) =>
  prof ? (getShortnameByProf(prof.toUpperCase()) ?? prof) : undefined;

/**
 * Heroes named by the Organization's sightings and hero timers, one per hero,
 * by name. A sighting carries the detector's spelling, so it wins over a
 * timer.
 */
export const getKnownHeroes = (
  sightings: readonly HeroSightingResponseDto[],
  timers: readonly Pick<TimerResponseDto, "npc">[],
): KnownHero[] => {
  const heroes = new Map<string, KnownHero>();

  for (const { npc } of timers) {
    if (!npc) continue;
    const key = getHeroSightingKey(npc.name);

    heroes.set(key, {
      key,
      name: npc.name,
      lvl: npc.lvl,
      prof: toShortname(npc.prof),
    });
  }

  for (const { hero } of sightings)
    heroes.set(hero.key, {
      key: hero.key,
      name: hero.name,
      lvl: hero.lvl,
      prof: toShortname(hero.prof),
    });

  return sortBy([...heroes.values()], [(hero) => hero.name.toLowerCase()]);
};
