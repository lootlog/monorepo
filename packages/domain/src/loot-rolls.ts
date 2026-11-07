import { findMargonemWorld } from "./margonem-worlds.js";

/**
 * How many times Margonem rolls a boss's loot table on one kill, from the
 * game's rules at https://pomoc.margonem.pl/index/view,372 (1.8, "Wiele
 * losowań"). Elites II, heroes, event heroes and titans roll once per two
 * survivors, `min(10, 1 + floor((survivors - 1) / 2 + rng))` with `rng` 0 or
 * 0.5 at even odds, which averages `(survivors + 1) / 2`: 5.5 for a full
 * party of 10. Elites II and heroes roll once when the party's levels spread
 * too far; titans never check. Colossi summoned by Hero Trackers share their
 * loot like heroes do, as Lootlog's loots show, so they roll like heroes.
 * Other colossi give every party member, alive or dead, one roll of their
 * own over the items of their profession; drop rates read the professions
 * for those. Every other monster rolls once.
 */

/** The most rolls one kill can get. */
const MAX_ROLLS = 10;

/** Monster types that roll once per two survivors. */
const MULTI_ROLL_TYPES = new Set([
  "ELITE2",
  "HERO",
  "EVENT_HERO",
  "TITAN",
  "COLOSSUS",
]);

/** Multi-roll types that roll once when the party's levels spread too far. */
const LEVEL_CHECKED_TYPES = new Set([
  "ELITE2",
  "HERO",
  "EVENT_HERO",
  "COLOSSUS",
]);

/** A party member as the battle ends. */
export type LootRollMember = Readonly<{
  /** Margonem's profession shortname, such as `w`; empty when unknown. */
  prof: string;
  lvl: number;
  alive: boolean;
}>;

/** Margonem's profession shortnames, in a fixed order. */
export const LOOT_ROLL_PROFESSIONS = ["w", "p", "b", "m", "t", "h"] as const;

export type LootRollProfession = (typeof LOOT_ROLL_PROFESSIONS)[number];

/** Whether a boss of the type rolls its loot once per two survivors. */
export const isMultiRollType = (npcType: string | null | undefined) =>
  MULTI_ROLL_TYPES.has(npcType ?? "");

/**
 * The rolls a party gets from a boss that rolls per survivor, each count with
 * its odds: an even party gets one more roll half the time.
 */
const getSharedRolls = (survivors: number) => {
  if (survivors < 1) return [];

  const fewer = Math.min(MAX_ROLLS, 1 + Math.floor((survivors - 1) / 2));
  const more = Math.min(MAX_ROLLS, 1 + Math.floor((survivors - 1) / 2 + 0.5));

  return fewer === more
    ? [{ rolls: fewer, odds: 1 }]
    : [
        { rolls: fewer, odds: 0.5 },
        { rolls: more, odds: 0.5 },
      ];
};

/** The rolls a party gets on average from a boss that rolls per survivor. */
export const getExpectedSharedRolls = (survivors: number) =>
  getSharedRolls(survivors).reduce(
    (total, { rolls, odds }) => total + rolls * odds,
    0,
  );

/**
 * The chance that a kill by this many survivors drops the item at least once,
 * from the chance of one roll: `1 - (1 - p)^rolls` over the rolls they get.
 */
export const getSharedDropChance = (perRoll: number, survivors: number) =>
  getSharedRolls(survivors).reduce(
    (total, { rolls, odds }) => total + odds * (1 - (1 - perRoll) ** rolls),
    0,
  );

/**
 * How far a world lets a party's levels spread: public worlds 0.2, private
 * worlds 0.4. A world Lootlog does not list as public counts as private.
 */
const getLevelSpreadFactor = (world: string) =>
  findMargonemWorld(world.trim().toLowerCase()) ? 0.2 : 0.4;

/**
 * Whether a party's levels are close enough for several rolls: its lowest
 * level reaches `max(min(ceil((min(highest, 300) - 4) / (1 + factor)),
 * highest - 14), 1)`.
 */
export const isLootRollLevelSpreadAllowed = (
  levels: ReadonlyArray<number>,
  world: string,
) => {
  if (levels.length === 0) return true;

  const highest = Math.max(...levels);

  const lowestAllowed = Math.max(
    Math.min(
      Math.ceil(
        (Math.min(highest, 300) - 4) / (1 + getLevelSpreadFactor(world)),
      ),
      highest - 14,
    ),
    1,
  );

  return Math.min(...levels) >= lowestAllowed;
};

/** What one kill's party means for the boss's loot rolls. */
export type KillLootRolls = Readonly<{
  /** The rolls of a shared loot, on average. */
  rolls: number;
  /** Party members of each profession, alive or dead. */
  members: Readonly<Record<LootRollProfession, number>>;
}>;

export const getKillLootRolls = ({
  npcType,
  world,
  party,
}: {
  npcType: string;
  world: string;
  party: ReadonlyArray<LootRollMember>;
}): KillLootRolls => {
  const survivors = party.filter(({ alive }) => alive).length;

  const count = (prof: LootRollProfession) =>
    party.filter((member) => member.prof === prof).length;

  const members = {
    w: count("w"),
    p: count("p"),
    b: count("b"),
    m: count("m"),
    t: count("t"),
    h: count("h"),
  };

  if (survivors === 0) return { rolls: 0, members };

  const isMultiRoll =
    MULTI_ROLL_TYPES.has(npcType) &&
    (!LEVEL_CHECKED_TYPES.has(npcType) ||
      isLootRollLevelSpreadAllowed(
        party.map(({ lvl }) => lvl),
        world,
      ));

  return {
    rolls: isMultiRoll ? getExpectedSharedRolls(survivors) : 1,
    members,
  };
};
