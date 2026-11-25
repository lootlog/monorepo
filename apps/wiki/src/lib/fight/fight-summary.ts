import {
  simulateFight,
  type FightEvent,
  type FightResult,
  type FightSetup,
} from "./fight-simulator";
import { withAllyHealth } from "./fight-state";

type DamageSource = "strike" | "skill" | "overTime";

type DamageBySource = Readonly<Record<DamageSource, number>>;

export type FighterSummary = {
  readonly name: string;
  readonly team: number;
  readonly maxHp: number;
  readonly survivalRate: number;
  readonly averageHpLeft: number;
  readonly averageHpLeftOnWin: number | null;
  readonly averageMoves: number;
  readonly averageStrikes: number;
  readonly averageCasts: number;
  readonly averageLostTurns: number;
  readonly critRate: number;
  readonly evadedRate: number;
  readonly parriedRate: number;
  readonly blockedRate: number;
  readonly pierceRate: number;
  readonly counteredRate: number;
  readonly stunRate: number;
  readonly averageTaken: DamageBySource;
  readonly averageHealed: number;
  readonly skillUsesPerMove: ReadonlyMap<string, number>;
};

export type FightLengthBucket = {
  readonly from: number;
  readonly to: number;
  readonly wins: readonly number[];
  readonly draws: number;
};

export type FightSummary = {
  readonly runs: number;
  readonly winRate: readonly number[];
  readonly winRateMargin: readonly number[];
  readonly drawRate: number;
  readonly averageMoves: number;
  readonly moves: {
    readonly shortest: number;
    readonly p10: number;
    readonly median: number;
    readonly p90: number;
    readonly longest: number;
  };
  readonly lengths: readonly FightLengthBucket[];
  readonly fighters: readonly FighterSummary[];
};

const MAX_LENGTH_BUCKETS = 20;

const CONFIDENCE_Z = 1.96;

export const seededRandom = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};

const quantile = (sorted: readonly number[], share: number) =>
  sorted[Math.floor(share * (sorted.length - 1))] ?? 0;

const lengthBuckets = (
  outcomes: readonly { moves: number; winner: number | null }[],
  teams: number,
  sortedMoves: readonly number[],
): FightLengthBucket[] => {
  const shortest = sortedMoves[0] ?? 0;
  const longest = sortedMoves.at(-1) ?? 0;

  const width = Math.max(
    1,
    Math.ceil((longest - shortest + 1) / MAX_LENGTH_BUCKETS),
  );

  const buckets = Array.from(
    { length: Math.floor((longest - shortest) / width) + 1 },
    (_, index) => ({
      from: shortest + index * width,
      to: shortest + (index + 1) * width - 1,
      wins: Array.from({ length: teams }, () => 0),
      draws: 0,
    }),
  );

  for (const { moves, winner } of outcomes) {
    const bucket = buckets[Math.floor((moves - shortest) / width)];

    if (!bucket) continue;

    if (winner === null) bucket.draws += 1;
    else bucket.wins[winner] = (bucket.wins[winner] ?? 0) + 1;
  }

  return buckets;
};

export const createFightTally = (setup: FightSetup) => {
  const maxHp = withAllyHealth(setup.teams).flatMap((team) =>
    team.map((combatant) => combatant.hp),
  );

  const fighters = setup.teams.flatMap((team, teamIndex) =>
    team.map((combatant) => ({
      name: combatant.name,
      team: teamIndex,
      survived: 0,
      wins: 0,
      hpLeft: 0,
      hpLeftOnWin: 0,
      moves: 0,
      strikes: 0,
      crits: 0,
      evaded: 0,
      parried: 0,
      blocked: 0,
      pierced: 0,
      countered: 0,
      stuns: 0,
      casts: 0,
      lostTurns: 0,
      taken: { strike: 0, skill: 0, overTime: 0 },
      healed: 0,
      skillUses: new Map<string, number>(),
    })),
  );

  const outcomes: { moves: number; winner: number | null }[] = [];
  const wins = setup.teams.map(() => 0);
  let draws = 0;
  let hp = [...maxHp];

  const trackHp = (
    next: readonly number[],
    source: DamageSource,
    healed: { index: number; amount: number },
  ) => {
    next.forEach((value, index) => {
      const fighter = fighters[index];

      const lost =
        (hp[index] ?? value) -
        value +
        (index === healed.index ? healed.amount : 0);

      if (fighter && lost > 0) fighter.taken[source] += lost;
    });

    hp = [...next];
  };

  const record = (event: FightEvent) => {
    const actor = fighters[event.actor];

    if (!actor) return;

    switch (event.kind) {
      case "strike":
        actor.strikes += 1;

        if (event.crit) actor.crits += 1;

        if (event.evaded) actor.evaded += 1;

        if (event.parried) actor.parried += 1;

        if (event.blocked > 0) actor.blocked += 1;

        if (event.pierced) actor.pierced += 1;

        if (event.countered) actor.countered += 1;

        if (event.stun) actor.stuns += 1;
        trackHp(event.hp, "strike", {
          index: event.target,
          amount: event.lastHeal,
        });
        break;
      case "skill":
        actor.casts += 1;
        trackHp(event.hp, "skill", {
          index: event.target,
          amount: event.lastHeal,
        });
        break;
      case "damageOverTime":
        trackHp(event.hp, "overTime", {
          index: event.actor,
          amount: event.lastHeal,
        });
        break;
      case "lostTurn":
        actor.lostTurns += 1;
        break;
      default:
        hp = [...event.hp];
    }
  };

  const add = (result: FightResult) => {
    outcomes.push({ moves: result.moves, winner: result.winner });

    if (result.winner === null) draws += 1;
    else wins[result.winner] = (wins[result.winner] ?? 0) + 1;

    result.fighters.forEach((outcome, index) => {
      const totals = fighters[index];

      if (!totals) return;

      const hpShare = outcome.hpLeft / Math.max(1, maxHp[index] ?? 0);

      totals.survived += outcome.alive ? 1 : 0;
      totals.hpLeft += hpShare;
      totals.moves += outcome.moves;
      totals.healed += outcome.healed;

      if (result.winner === totals.team) {
        totals.wins += 1;
        totals.hpLeftOnWin += hpShare;
      }

      for (const [name, uses] of outcome.skillUses) {
        totals.skillUses.set(name, (totals.skillUses.get(name) ?? 0) + uses);
      }
    });

    hp = [...maxHp];
  };

  const summary = (): FightSummary => {
    const runs = Math.max(1, outcomes.length);

    const sortedMoves = outcomes
      .map(({ moves }) => moves)
      .sort((left, right) => left - right);

    const per = (value: number) => value / runs;
    const rate = (count: number, total: number) => count / Math.max(1, total);

    return {
      runs: outcomes.length,
      winRate: wins.map(per),
      winRateMargin: wins.map((count) => {
        const share = per(count);

        return CONFIDENCE_Z * Math.sqrt((share * (1 - share)) / runs);
      }),
      drawRate: per(draws),
      averageMoves: per(sortedMoves.reduce((total, moves) => total + moves, 0)),
      moves: {
        shortest: sortedMoves[0] ?? 0,
        p10: quantile(sortedMoves, 0.1),
        median: quantile(sortedMoves, 0.5),
        p90: quantile(sortedMoves, 0.9),
        longest: sortedMoves.at(-1) ?? 0,
      },
      lengths: lengthBuckets(outcomes, setup.teams.length, sortedMoves),
      fighters: fighters.map((totals, index) => ({
        name: totals.name,
        team: totals.team,
        maxHp: maxHp[index] ?? 0,
        survivalRate: per(totals.survived),
        averageHpLeft: per(totals.hpLeft),
        averageHpLeftOnWin:
          totals.wins > 0 ? totals.hpLeftOnWin / totals.wins : null,
        averageMoves: per(totals.moves),
        averageStrikes: per(totals.strikes),
        averageCasts: per(totals.casts),
        averageLostTurns: per(totals.lostTurns),
        critRate: rate(totals.crits, totals.strikes),
        evadedRate: rate(totals.evaded, totals.strikes),
        parriedRate: rate(totals.parried, totals.strikes),
        blockedRate: rate(totals.blocked, totals.strikes),
        pierceRate: rate(totals.pierced, totals.strikes - totals.evaded),
        counteredRate: rate(totals.countered, totals.strikes),
        stunRate: rate(totals.stuns, totals.strikes),
        averageTaken: {
          strike: per(totals.taken.strike),
          skill: per(totals.taken.skill),
          overTime: per(totals.taken.overTime),
        },
        averageHealed: per(totals.healed),
        skillUsesPerMove: new Map(
          [...totals.skillUses].map(([name, uses]) => [
            name,
            rate(uses, totals.moves),
          ]),
        ),
      })),
    };
  };

  return { record, add, summary };
};

export const simulateFights = (
  setup: FightSetup,
  options: { readonly runs: number; readonly seed: number },
): FightSummary => {
  const random = seededRandom(options.seed);
  const tally = createFightTally(setup);

  for (let run = 0; run < options.runs; run += 1) {
    tally.add(simulateFight(setup, random, tally.record));
  }

  return tally.summary();
};
