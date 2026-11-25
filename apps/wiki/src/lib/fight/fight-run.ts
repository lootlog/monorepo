import { BattleProcessor } from "@lootlog/battle-processor/battle-processor";
import type { Battle, RawBattle } from "@lootlog/battle-ui/lib/battle-types";
import { SIMULATED_CHARACTER_ID, fightBattleLog } from "./fight-battle-log";
import { createFightStates, simulateFight } from "./fight-simulator";
import type { FightResult } from "./fight-events";
import { snapshotFighter } from "./fight-snapshot";
import {
  groupFightTurns,
  type FightTurn,
  type RecordedEvent,
} from "./fight-turns";
import {
  createFightTally,
  seededRandom,
  type FightSummary,
} from "./fight-summary";
import { toCombatant, type FighterProfile } from "./fighter-profile";

export const SIMULATION_RUN_OPTIONS = [100, 500, 1000, 2500, 5000] as const;

export const DEFAULT_SIMULATION_RUNS = 1000;

const SLICE_MS = 12;

export type FightSample = {
  result: FightResult;
  battle: Battle;
  rawBattle: RawBattle;
  turns: readonly FightTurn[];
  turnOfRow: readonly number[];
};

export type Fighters = {
  mine: FighterProfile;
  opponent: FighterProfile;
  names: { mine: string; opponent: string };
  levelAdvantage: boolean;
};

const setupOf = ({ mine, opponent, names, levelAdvantage }: Fighters) => ({
  teams: [
    [toCombatant(mine, names.mine)],
    [toCombatant(opponent, names.opponent)],
  ],
  levelAdvantage,
});

const nextTask = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

export const sampleFight = (fighters: Fighters, seed: number): FightSample => {
  const setup = setupOf(fighters);
  const recorded: RecordedEvent[] = [];

  const result = simulateFight(
    setup,
    seededRandom(seed),
    (event, states, turn) => {
      recorded.push({ event, turn, after: states.map(snapshotFighter) });
    },
    true,
  );

  const events = recorded.map(({ event }) => event);

  const log = fightBattleLog(setup, events, result);
  const analysis = new BattleProcessor("full").processBattle(log.payload);

  return {
    result,
    battle: {
      characterId: SIMULATED_CHARACTER_ID,
      warriors: analysis.warriors,
    },
    rawBattle: {
      characterId: SIMULATED_CHARACTER_ID,
      events: analysis.parsedMoves,
    },
    ...groupFightTurns(
      log.rows,
      recorded,
      createFightStates(setup).map(snapshotFighter),
    ),
  };
};

export const runFight = async (
  fighters: Fighters,
  options: {
    readonly runs: number;
    readonly seed: number;
    readonly signal: AbortSignal;
    readonly onProgress: (share: number) => void;
  },
): Promise<FightSummary | null> => {
  const setup = setupOf(fighters);
  const tally = createFightTally(setup, options.seed);
  let done = 0;

  while (done < options.runs) {
    const sliceEnd = performance.now() + SLICE_MS;

    do {
      tally.simulateNext();
      done += 1;
    } while (done < options.runs && performance.now() < sliceEnd);

    options.onProgress(done / options.runs);
    await nextTask();

    if (options.signal.aborted) return null;
  }

  return tally.summary();
};
