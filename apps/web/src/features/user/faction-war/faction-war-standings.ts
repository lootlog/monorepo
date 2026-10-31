import { sortBy } from "es-toolkit";
import {
  FactionWarFaction,
  factionWarShares,
  type FactionWarFaction as Faction,
} from "@lootlog/domain/faction-war";

/** Left to right, as the art faces: fire on the left, ice on the right. */
export const FACTION_WAR_SIDES = [
  FactionWarFaction.BARBATOS,
  FactionWarFaction.TANROTH,
] as const;

type FactionTotal = {
  faction: Faction;
  /** The war score: each day's points times that day's underdog multiplier. */
  points: number;
  /** Points as players earned them, before any multiplier. */
  rawPoints: number;
  players: number;
  /** The underdog multiplier of the latest scored day; 1 for the larger faction. */
  multiplier: number;
};

export type FactionWarStanding = FactionTotal & {
  /** The faction's part of all points, 0–1; even while nobody has scored. */
  share: number;
};

/** Both factions in side order, a missing total counting as nothing yet. */
export const getFactionWarStandings = (
  totals: readonly FactionTotal[],
): FactionWarStanding[] => {
  const sides = FACTION_WAR_SIDES.map(
    (faction) =>
      totals.find((total) => total.faction === faction) ?? {
        faction,
        points: 0,
        rawPoints: 0,
        players: 0,
        multiplier: 1,
      },
  );

  const shares = factionWarShares(sides);

  return sides.map((side) => ({ ...side, share: shares[side.faction] }));
};

export type FactionWarOutcome =
  | { kind: "none" }
  | { kind: "winner"; faction: Faction }
  | { kind: "tie" };

/** How an ended war is announced: the API names no winner when nobody scored, both on a tie. */
export const getFactionWarOutcome = (
  winners: readonly Faction[],
): FactionWarOutcome => {
  const [first, ...others] = winners;

  if (!first) return { kind: "none" };

  return others.length === 0
    ? { kind: "winner", faction: first }
    : { kind: "tie" };
};

/**
 * One chart row per war day with each faction's score that day (its points
 * times the day's underdog multiplier), zero where a faction scored nothing.
 */
export const getFactionWarDailyRows = (
  days: readonly { day: string; faction: Faction; score: number }[],
) => {
  const rows = new Map<string, Record<Faction, number>>();

  for (const { day, faction, score } of days) {
    const row = rows.get(day) ?? { BARBATOS: 0, TANROTH: 0 };

    row[faction] += score;
    rows.set(day, row);
  }

  return sortBy(
    [...rows].map(([day, points]) => ({ day, ...points })),
    [(row) => row.day],
  );
};
