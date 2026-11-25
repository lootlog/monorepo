import { BattleProcessor } from "@lootlog/battle-processor/battle-processor";
import type { Battle, RawBattle } from "@lootlog/battle-ui/lib/battle-types";
import { SIMULATED_CHARACTER_ID, fightBattlePayload } from "./fight-battle-log";
import {
  simulateFight,
  type FightEvent,
  type FightResult,
} from "./fight-simulator";
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
};

export type FightRun = {
  summary: FightSummary;
  sample: FightSample;
};

export type Fighters = {
  mine: FighterProfile;
  opponent: FighterProfile;
  names: { mine: string; opponent: string };
};

const setupOf = ({ mine, opponent, names }: Fighters) => ({
  teams: [
    [toCombatant(mine, names.mine)],
    [toCombatant(opponent, names.opponent)],
  ],
});

const nextTask = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

export const sampleFight = (fighters: Fighters, seed: number): FightSample => {
  const setup = setupOf(fighters);
  const events: FightEvent[] = [];

  const result = simulateFight(setup, seededRandom(seed), (event) => {
    events.push(event);
  });

  const analysis = new BattleProcessor("full").processBattle(
    fightBattlePayload(setup, events, result),
  );

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
): Promise<FightRun | null> => {
  const setup = setupOf(fighters);
  const tally = createFightTally(setup);
  const random = seededRandom(options.seed);
  let done = 0;

  while (done < options.runs) {
    const sliceEnd = performance.now() + SLICE_MS;

    do {
      tally.add(simulateFight(setup, random, tally.record));
      done += 1;
    } while (done < options.runs && performance.now() < sliceEnd);

    options.onProgress(done / options.runs);
    await nextTask();

    if (options.signal.aborted) return null;
  }

  return {
    summary: tally.summary(),
    sample: sampleFight(fighters, options.seed + 1),
  };
};
