import { NO_WINNER } from "./battle-log.js";
import { normalizeName, type WarriorRoster } from "./warrior.js";

export type BattleOutcome = {
  winner: string;
  loser: string;
  /** `0` when the battle has no winner: unfinished or a turn-limit draw. */
  winningTeam: number | null;
  losingTeam: number | null;
  hasFlee: boolean;
  /** The submitter left before Margonem ended the battle; it has no result. */
  unfinished: boolean;
};

type OutcomeInput = {
  roster: WarriorRoster;
  lastHp: ReadonlyMap<string, number>;
  winner: string;
  loser: string;
  hasFlee: boolean;
  /** Whether the capture includes the end of the battle. */
  ended: boolean;
};

type OutcomeTeams = Pick<BattleOutcome, "winningTeam" | "losingTeam">;

const opposingTeam = (team: number): number => (team === 1 ? 2 : 1);

const splitOutcomeNames = (value: string): string[] =>
  value
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

/** The team most of the named warriors belong to. */
const getTeamFromOutcomeNames = (
  roster: WarriorRoster,
  names: string[],
): number | null => {
  if (names.length === 0) return null;

  const normalizedNames = new Set(names.map(normalizeName));
  const numericIds = new Set(names.filter((token) => /^\d+$/.test(token)));
  const counts = new Map<number, number>();

  for (const [id, warrior] of roster.byId) {
    if (
      numericIds.has(id) ||
      numericIds.has(warrior.originalId) ||
      normalizedNames.has(normalizeName(warrior.name))
    ) {
      counts.set(warrior.team, (counts.get(warrior.team) ?? 0) + 1);
    }
  }

  const [topEntry] = [...counts].sort((a, b) => b[1] - a[1]);

  return topEntry ? topEntry[0] : null;
};

/**
 * Without outcome names, the team with more survivors wins, then the one
 * with more HP left, more damage dealt and less damage taken.
 */
const resolveOutcomeFromTotals = (
  roster: WarriorRoster,
  lastHp: ReadonlyMap<string, number>,
): OutcomeTeams => {
  const totals = new Map<
    number,
    { alive: number; hp: number; dealt: number; taken: number }
  >();

  for (const [id, warrior] of roster.byId) {
    const hp = lastHp.get(id) ?? 0;

    const team = totals.get(warrior.team) ?? {
      alive: 0,
      hp: 0,
      dealt: 0,
      taken: 0,
    };

    team.alive += hp > 0 ? 1 : 0;
    team.hp += hp;
    team.dealt += warrior.damageDealt;
    team.taken += warrior.damageTaken;
    totals.set(warrior.team, team);
  }

  const one = totals.get(1) ?? { alive: 0, hp: 0, dealt: 0, taken: 0 };
  const two = totals.get(2) ?? { alive: 0, hp: 0, dealt: 0, taken: 0 };

  const teamOneWins =
    one.alive !== two.alive
      ? one.alive > two.alive
      : one.hp !== two.hp
        ? one.hp > two.hp
        : one.dealt !== two.dealt
          ? one.dealt > two.dealt
          : one.taken !== two.taken
            ? one.taken < two.taken
            : true;

  const winningTeam = teamOneWins ? 1 : 2;

  return { winningTeam, losingTeam: opposingTeam(winningTeam) };
};

const resolveOutcomeTeams = ({
  roster,
  lastHp,
  winner,
  loser,
}: OutcomeInput): OutcomeTeams => {
  const winningTeam = getTeamFromOutcomeNames(
    roster,
    splitOutcomeNames(winner),
  );

  const losingTeam = getTeamFromOutcomeNames(roster, splitOutcomeNames(loser));

  if (winningTeam !== null && losingTeam !== null) {
    return { winningTeam, losingTeam };
  }

  if (winningTeam !== null) {
    return { winningTeam, losingTeam: opposingTeam(winningTeam) };
  }

  if (losingTeam !== null) {
    return { winningTeam: opposingTeam(losingTeam), losingTeam };
  }

  return resolveOutcomeFromTotals(roster, lastHp);
};

export const resolveBattleOutcome = (input: OutcomeInput): BattleOutcome => {
  const base = {
    winner: input.winner,
    loser: input.loser,
    hasFlee: input.hasFlee,
  };

  // A player who dies in a group battle may close it before Margonem ends
  // it. That capture has neither the end packet nor its outcome lines, so no
  // team can be named the winner.
  if (!input.ended && input.winner === "" && input.loser === "") {
    return {
      ...base,
      winningTeam: 0,
      losingTeam: 0,
      unfinished: true,
    };
  }

  // A flee also ends with `winner=?`; its teams keep the inferred result the
  // flee-aware analytics and views expect.
  if (input.winner === NO_WINNER && !input.hasFlee) {
    return { ...base, winningTeam: 0, losingTeam: 0, unfinished: false };
  }

  return { ...base, ...resolveOutcomeTeams(input), unfinished: false };
};
