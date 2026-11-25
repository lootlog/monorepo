import { BattleProcessor } from "@lootlog/battle-processor/battle-processor";
import type { Battle, RawBattle } from "@lootlog/battle-ui/lib/battle-types";
import { SIMULATED_CHARACTER_ID, fightBattlePayload } from "./fight-battle-log";
import {
  simulateFight,
  type FightEvent,
  type FightResult,
} from "./fight-simulator";
import {
  seededRandom,
  simulateFights,
  type FightSummary,
} from "./fight-summary";
import { toCombatant, type FighterProfile } from "./fighter-profile";

export const SIMULATED_FIGHTS = 400;

export type FightSample = {
  result: FightResult;
  battle: Battle;
  rawBattle: RawBattle;
};

export type FightRun = {
  summary: FightSummary;
  sample: FightSample;
};

type Fighters = {
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

export const runFight = (fighters: Fighters, seed: number): FightRun => ({
  summary: simulateFights(setupOf(fighters), {
    runs: SIMULATED_FIGHTS,
    seed,
  }),
  sample: sampleFight(fighters, seed + 1),
});
