/**
 * Faction wars are global Lootlog events: every User picks one faction once,
 * earns points for it through play, and the members of the winning faction
 * wear its highlight in game until the next war ends.
 *
 * Wars are defined here, in code. A new war is a new entry with its own dates
 * and art; the API stores only picks and points.
 */
import { groupBy, mapValues, maxBy, minBy } from "es-toolkit";
import { getDateFormatter } from "@lootlog/datetime";

export const FACTION_WAR_TIMEZONE = "Europe/Warsaw" as const;

export const FactionWarFaction = {
  BARBATOS: "BARBATOS",
  TANROTH: "TANROTH",
} as const;

export type FactionWarFaction =
  (typeof FactionWarFaction)[keyof typeof FactionWarFaction];

export const FactionWarPointSource = {
  KILL: "KILL",
  LOOT: "LOOT",
  ONLINE: "ONLINE",
  PVP: "PVP",
} as const;

export type FactionWarPointSource =
  (typeof FactionWarPointSource)[keyof typeof FactionWarPointSource];

export type FactionWarScoring = {
  /** Points per kill by NPC type; types missing here earn nothing. */
  readonly killPoints: Readonly<Record<string, number>>;
  /** Points per caught item by rarity; rarities missing here earn nothing. */
  readonly lootPoints: Readonly<Record<string, number>>;
  readonly onlineSecondsPerPoint: number;
  readonly pvpWinPoints: number;
  /** Most points one User can earn from a source in one Warsaw day. */
  readonly dailyCaps: Readonly<Record<FactionWarPointSource, number>>;
  /** Highest daily multiplier a faction with fewer active players receives. */
  readonly underdogBonusCap: number;
};

export type FactionWar = {
  readonly id: string;
  readonly factions: readonly [FactionWarFaction, FactionWarFaction];
  /** ISO instants; points count in `[startsAt, endsAt)`. */
  readonly startsAt: string;
  readonly endsAt: string;
  readonly scoring: FactionWarScoring;
};

export const FACTION_WARS: readonly FactionWar[] = [
  {
    id: "2026-barbatos-tanroth",
    factions: [FactionWarFaction.BARBATOS, FactionWarFaction.TANROTH],
    startsAt: "2026-10-20T00:00:00+02:00",
    endsAt: "2026-11-17T00:00:00+01:00",
    scoring: {
      killPoints: {
        ELITE: 1,
        ELITE2: 3,
        HERO: 15,
        COLOSSUS: 25,
        TITAN: 40,
      },
      lootPoints: { UNIQUE: 2, HEROIC: 10, LEGENDARY: 50 },
      onlineSecondsPerPoint: 600,
      pvpWinPoints: 5,
      dailyCaps: { KILL: 300, LOOT: 150, ONLINE: 30, PVP: 50 },
      underdogBonusCap: 2,
    },
  },
];

const time = (iso: string) => Date.parse(iso);

/** The Warsaw calendar day, `YYYY-MM-DD`, that daily caps count against. */
export const factionWarDay = (at: Date) =>
  getDateFormatter(FACTION_WAR_TIMEZONE).format(at);

export const isFactionWarRunning = (war: FactionWar, at: number) =>
  time(war.startsAt) <= at && at < time(war.endsAt);

/** The war whose scoring window contains `at`, if any. */
export const findRunningFactionWar = (at: number, wars = FACTION_WARS) =>
  wars.find((war) => isFactionWarRunning(war, at));

export const findFactionWar = (id: string, wars = FACTION_WARS) =>
  wars.find((war) => war.id === id);

/**
 * The war shown to players at `at`: the running one, else the next one, else
 * the last one that ended.
 */
export const findCurrentFactionWar = (at: number, wars = FACTION_WARS) =>
  findRunningFactionWar(at, wars) ??
  minBy(
    wars.filter((war) => time(war.startsAt) > at),
    (war) => time(war.startsAt),
  ) ??
  maxBy(
    wars.filter((war) => time(war.endsAt) <= at),
    (war) => time(war.endsAt),
  );

/**
 * The finished war whose champions wear its highlight at `at`: the latest war
 * that ended, until the war after it ends too.
 */
export const findChampionFactionWar = (at: number, wars = FACTION_WARS) => {
  const latest = maxBy(
    wars.filter((war) => time(war.endsAt) <= at),
    (war) => time(war.endsAt),
  );

  if (!latest) return undefined;

  const successorEnded = wars.some(
    (war) =>
      time(war.startsAt) >= time(latest.endsAt) && time(war.endsAt) <= at,
  );

  return successorEnded ? undefined : latest;
};

export const factionWarKillPoints = (war: FactionWar, npcType: string) =>
  war.scoring.killPoints[npcType] ?? 0;

export const factionWarLootPoints = (
  war: FactionWar,
  rarities: readonly string[],
) =>
  rarities.reduce(
    (total, rarity) => total + (war.scoring.lootPoints[rarity] ?? 0),
    0,
  );

/** Online points for a day: whole `onlineSecondsPerPoint` blocks, capped. */
export const factionWarOnlinePoints = (
  war: FactionWar,
  onlineSeconds: number,
) =>
  Math.min(
    war.scoring.dailyCaps.ONLINE,
    Math.floor(Math.max(0, onlineSeconds) / war.scoring.onlineSecondsPerPoint),
  );

export type FactionWarDayStats = {
  readonly day: string;
  readonly faction: FactionWarFaction;
  readonly points: number;
  /** Users of the faction who earned any point that day. */
  readonly activePlayers: number;
};

/**
 * One day's multipliers: a faction with fewer active players than the largest
 * one gets `largest / own`, up to `underdogBonusCap`. A faction nobody played
 * for keeps 1; it has no points to multiply.
 */
export const factionWarDayMultipliers = (
  war: FactionWar,
  activePlayers: Readonly<Record<FactionWarFaction, number>>,
): Record<FactionWarFaction, number> => {
  const largest = Math.max(
    ...war.factions.map((faction) => activePlayers[faction]),
  );

  return {
    BARBATOS: multiplierFor(war, largest, activePlayers.BARBATOS),
    TANROTH: multiplierFor(war, largest, activePlayers.TANROTH),
  };
};

const multiplierFor = (war: FactionWar, largest: number, own: number) =>
  own === 0
    ? 1
    : Math.min(war.scoring.underdogBonusCap, Math.max(1, largest / own));

const byFaction = <Value>(value: () => Value) => ({
  BARBATOS: value(),
  TANROTH: value(),
});

/**
 * Applies each day's underdog multipliers. Players keep their raw points; only
 * the faction score is multiplied. `currentMultipliers` are those of the
 * latest day anyone scored, or 1 before the first point.
 */
export const factionWarStandings = (
  war: FactionWar,
  stats: readonly FactionWarDayStats[],
) => {
  const rowsByDay = groupBy(stats, (row) => row.day);
  const rawPoints = byFaction(() => 0);
  const score = byFaction(() => 0);
  let currentMultipliers = byFaction(() => 1);

  // `YYYY-MM-DD` keys sort chronologically as text.
  const days = Object.keys(rowsByDay)
    .sort()
    .flatMap((day) => {
      const points = byFaction(() => 0);
      const activePlayers = byFaction(() => 0);

      for (const row of rowsByDay[day] ?? []) {
        points[row.faction] += row.points;
        activePlayers[row.faction] += row.activePlayers;
      }

      const multipliers = factionWarDayMultipliers(war, activePlayers);

      currentMultipliers = multipliers;

      for (const faction of war.factions) {
        rawPoints[faction] += points[faction];
        score[faction] += points[faction] * multipliers[faction];
      }

      return war.factions.map((faction) => ({
        day,
        faction,
        points: points[faction],
        activePlayers: activePlayers[faction],
        multiplier: multipliers[faction],
        score: Math.round(points[faction] * multipliers[faction]),
      }));
    });

  return {
    days,
    rawPoints,
    score: mapValues(score, Math.round),
    currentMultipliers,
  };
};

/**
 * Each faction's part of all points, 0–1, for the tug-of-war bar; an even
 * split before anyone scores.
 */
export const factionWarShares = (
  totals: readonly {
    readonly faction: FactionWarFaction;
    readonly points: number;
  }[],
): Record<FactionWarFaction, number> => {
  const points = byFaction(() => 0);

  for (const total of totals) points[total.faction] += total.points;

  const all = points.BARBATOS + points.TANROTH;

  return all > 0
    ? mapValues(points, (value) => value / all)
    : byFaction(() => 0.5);
};

/**
 * Factions with the highest score. Both win a tie; nobody wins a war where no
 * faction scored.
 */
export const factionWarWinners = (
  totals: Readonly<Record<FactionWarFaction, number>>,
  factions: readonly FactionWarFaction[],
): FactionWarFaction[] => {
  const best = Math.max(...factions.map((faction) => totals[faction]));

  return best > 0 ? factions.filter((faction) => totals[faction] === best) : [];
};
