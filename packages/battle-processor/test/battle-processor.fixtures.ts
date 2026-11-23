import { expect } from "bun:test";
import type { BattlePayload } from "../src/battle-log.js";
import { BattleProcessor } from "../src/battle-processor.js";

export const processBattleWithStatisticsParity = (
  battleData: BattlePayload,
) => {
  const detailed = new BattleProcessor().processBattle(battleData);

  const statisticsOnly = new BattleProcessor("statistics").processBattle(
    battleData,
  );

  expect(statisticsOnly).toEqual({
    ...detailed,
    battleTimeline: [],
    actionCoverage: {
      totalActions: 0,
      handledActions: 0,
      unhandledActions: 0,
      handledPercentage: 100,
      actions: [],
      unknown: [],
    },
  });

  return detailed;
};

export const duelist = (originalId: number, name: string, team: number) => ({
  originalId,
  name,
  lvl: 50,
  prof: "w",
  icon: "icon",
  team,
});

export const duel = (moves: string[]): BattlePayload => ({
  accountId: "test-account",
  characterId: "1",
  world: "test-world",
  events: [
    {
      ev: 1000,
      f: {
        w: {
          "1": duelist(1, "Attacker", 1),
          "2": duelist(2, "Defender", 2),
          "3": duelist(3, "Ally", 1),
          "4": duelist(4, "Bystander", 2),
        },
        m: moves,
      },
    },
  ],
});

export const findWarrior = (
  result: ReturnType<BattleProcessor["processBattle"]>,
  name: string,
) => result.warriors.find((w) => w.name === name);
