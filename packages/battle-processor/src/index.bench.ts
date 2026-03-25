import { describe, bench } from "vitest";
import { BattleProcessor, type BattlePayload } from "./index";

function createBattlePayload(moveCount: number): BattlePayload {
  const warriors: Record<
    string,
    {
      originalId: number;
      name: string;
      lvl: number;
      prof: string;
      icon: string;
      team: number;
    }
  > = {
    "1": {
      originalId: 1001,
      name: "WarriorAlpha",
      lvl: 200,
      prof: "w",
      icon: "warrior.png",
      team: 1,
    },
    "2": {
      originalId: 1002,
      name: "MageOmega",
      lvl: 180,
      prof: "m",
      icon: "mage.png",
      team: 1,
    },
    "3": {
      originalId: 2001,
      name: "HunterBeta",
      lvl: 190,
      prof: "h",
      icon: "hunter.png",
      team: 2,
    },
    "4": {
      originalId: 2002,
      name: "PaladinGamma",
      lvl: 195,
      prof: "p",
      icon: "paladin.png",
      team: 2,
    },
  };

  const attackerIds = ["1", "2", "3", "4"];
  const defenderIds = ["3", "4", "1", "2"];
  const actionTypes = [
    "+dmg",
    "+dmgd",
    "+dmgf",
    "+crit",
    "+pierce",
    "-blok",
    "-evade",
    "heal",
  ];
  const moves: string[] = [];

  for (let i = 0; i < moveCount; i++) {
    const atkIdx = i % attackerIds.length;
    const defIdx = atkIdx;
    const atkId = attackerIds[atkIdx];
    const defId = defenderIds[defIdx];
    const hp1 = Math.max(1, 100 - Math.floor((i / moveCount) * 100));
    const hp2 = Math.max(1, 100 - Math.floor(((i + 1) / moveCount) * 100));
    const action = actionTypes[i % actionTypes.length];
    const value = 50 + (i % 200);
    moves.push(`${atkId}=${hp1};${defId}=${hp2};${action}=${value}`);
  }

  const events = [
    {
      ev: 1000,
      f: {
        w: warriors,
        m: moves.slice(0, Math.ceil(moveCount / 2)),
      },
    },
    {
      ev: 1000 + moveCount * 100,
      f: {
        m: moves.slice(Math.ceil(moveCount / 2)),
      },
    },
    {
      ev: 1000 + moveCount * 200,
      f: {
        m: [
          `1=10;3=0;winner=WarriorAlpha,MageOmega;loser=HunterBeta,PaladinGamma`,
        ],
      },
    },
  ];

  return {
    accountId: "test-account",
    characterId: "1",
    world: "pandora",
    events,
  };
}

describe("BattleProcessor", () => {
  const smallBattle = createBattlePayload(20);
  const mediumBattle = createBattlePayload(100);
  const largeBattle = createBattlePayload(500);

  bench("processBattle - small (20 moves)", () => {
    const processor = new BattleProcessor();
    processor.processBattle(smallBattle);
  });

  bench("processBattle - medium (100 moves)", () => {
    const processor = new BattleProcessor();
    processor.processBattle(mediumBattle);
  });

  bench("processBattle - large (500 moves)", () => {
    const processor = new BattleProcessor();
    processor.processBattle(largeBattle);
  });

  bench("extractAndParseMoves - 500 moves", () => {
    const processor = new BattleProcessor();
    processor.extractAndParseMoves(largeBattle.events);
  });
});
