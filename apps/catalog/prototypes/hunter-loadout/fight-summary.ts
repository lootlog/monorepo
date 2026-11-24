import { simulateFight, type FightSetup } from "./fight-simulator.js";

export type FightSummary = {
  readonly runs: number;
  readonly winRate: readonly number[];
  readonly drawRate: number;
  readonly averageTime: number;
  readonly averageMoves: number;
  readonly fighters: readonly {
    readonly name: string;
    readonly team: number;
    readonly survivalRate: number;
    readonly averageHpLeft: number;
    readonly averageDamage: number;
    readonly averageMoves: number;
    readonly averageHits: number;
    readonly critRate: number;
    readonly evadedRate: number;
    readonly pierceRate: number;
    readonly healedShare: number;
    readonly skillUsesPerMove: ReadonlyMap<string, number>;
  }[];
};

export const seededRandom = (seed: number) => {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
};

export const simulateFights = (
  setup: FightSetup,
  options: { readonly runs: number; readonly seed: number },
): FightSummary => {
  const random = seededRandom(options.seed);
  const wins = setup.teams.map(() => 0);
  let draws = 0;
  let time = 0;
  let moves = 0;

  const fighters = setup.teams.flatMap((team, teamIndex) =>
    team.map((combatant) => ({
      name: combatant.name,
      team: teamIndex,
      survived: 0,
      hpLeft: 0,
      maxHp: combatant.hp,
      damage: 0,
      moves: 0,
      hits: 0,
      crits: 0,
      evaded: 0,
      pierced: 0,
      healed: 0,
      skillUses: new Map<string, number>(),
    })),
  );

  for (let run = 0; run < options.runs; run += 1) {
    const result = simulateFight(setup, random);

    if (result.winner === null) draws += 1;
    else wins[result.winner] = (wins[result.winner] ?? 0) + 1;

    time += result.time;
    moves += result.moves;

    result.fighters.forEach((outcome, index) => {
      const totals = fighters[index];

      if (!totals) return;
      totals.survived += outcome.alive ? 1 : 0;
      totals.hpLeft += outcome.hpLeft / Math.max(1, totals.maxHp);
      totals.damage += outcome.damageDealt;
      totals.moves += outcome.moves;
      totals.hits += outcome.hits;
      totals.crits += outcome.crits;
      totals.evaded += outcome.evaded;
      totals.pierced += outcome.pierced;
      totals.healed += outcome.healed;

      for (const [name, uses] of outcome.skillUses) {
        totals.skillUses.set(name, (totals.skillUses.get(name) ?? 0) + uses);
      }
    });
  }

  const runs = Math.max(1, options.runs);

  return {
    runs: options.runs,
    winRate: wins.map((count) => count / runs),
    drawRate: draws / runs,
    averageTime: time / runs,
    averageMoves: moves / runs,
    fighters: fighters.map((totals) => ({
      name: totals.name,
      team: totals.team,
      survivalRate: totals.survived / runs,
      averageHpLeft: totals.hpLeft / runs,
      averageDamage: totals.damage / runs,
      averageMoves: totals.moves / runs,
      averageHits: totals.hits / runs,
      critRate: totals.crits / Math.max(1, totals.hits),
      evadedRate: totals.evaded / Math.max(1, totals.hits),
      pierceRate: totals.pierced / Math.max(1, totals.hits - totals.evaded),
      healedShare: totals.healed / runs / Math.max(1, totals.maxHp),
      skillUsesPerMove: new Map(
        [...totals.skillUses].map(([name, uses]) => [
          name,
          uses / Math.max(1, totals.moves),
        ]),
      ),
    })),
  };
};
