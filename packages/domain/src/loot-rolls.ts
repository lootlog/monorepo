import { findMargonemWorld } from "./margonem-worlds.js";

const MAX_ROLLS = 10;

const MULTI_ROLL_TYPES = new Set([
  "ELITE2",
  "HERO",
  "EVENT_HERO",
  "TITAN",
  "COLOSSUS",
]);

const LEVEL_CHECKED_TYPES = new Set([
  "ELITE2",
  "HERO",
  "EVENT_HERO",
  "COLOSSUS",
]);

export type LootRollMember = Readonly<{
  prof: string;
  lvl: number;
  alive: boolean;
}>;

export const LOOT_ROLL_PROFESSIONS = ["w", "p", "b", "m", "t", "h"] as const;

export type LootRollProfession = (typeof LOOT_ROLL_PROFESSIONS)[number];

export const isMultiRollType = (npcType: string | null | undefined) =>
  MULTI_ROLL_TYPES.has(npcType ?? "");

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

export const getExpectedSharedRolls = (survivors: number) =>
  getSharedRolls(survivors).reduce(
    (total, { rolls, odds }) => total + rolls * odds,
    0,
  );

export const getSharedDropChance = (perRoll: number, survivors: number) =>
  getSharedRolls(survivors).reduce(
    (total, { rolls, odds }) => total + odds * (1 - (1 - perRoll) ** rolls),
    0,
  );

const getLevelSpreadFactor = (world: string) =>
  findMargonemWorld(world.trim().toLowerCase()) ? 0.2 : 0.4;

const isLootRollLevelSpreadAllowed = (
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

export type KillLootRolls = Readonly<{
  rolls: number;
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
