import { createBattleTest } from "./battle-test-fixtures";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { beforeEach, describe, expect, it } from "vitest";
import { useBattleStore } from "@/store/game-store/battle.store";
import { BattleEventProcessor } from "./battle-event-processor";
import { useGameStore } from "@/store/game.store";

const createBattleStartEvent = (): GameEvent => ({
  f: {
    init: "1",
    m: ["alpha"],
    w: {
      "111": {
        hpp: 100,
        icon: "one.gif",
        id: 111,
        lvl: 100,
        name: "Player1",
        originalId: 111,
        prof: "w",
        team: 1,
        type: 0,
        wt: 0,
      },
      "222": {
        hpp: 100,
        icon: "two.gif",
        id: 222,
        lvl: 101,
        name: "Player2",
        originalId: 222,
        prof: "m",
        team: 2,
        type: 0,
        wt: 0,
      },
    },
  },
});

describe("BattleEventProcessor golden payload", () => {
  beforeEach(() => {
    useBattleStore.getState().clearEvents();
    useBattleStore.setState({
      battleState: "idle",
      battleWarriors: {},
      events: [],
      lastBattleHash: "",
      lastKillHash: "",
    });
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "67890",
        characterId: "12345",
        currentHp: 1,
        icon: "hero.gif",
        level: 300,
        maxHp: 1,
        name: "Hero",
        profession: "w",
        x: 1,
        y: 2,
      },
      interface: "ni",
      map: { id: 1, name: "Map", visibility: 30 },
      world: "pandora",
    });
  });

  it("keeps the normal battle DTO and both deterministic hashes stable", async () => {
    const fixture = createBattleTest();
    const processor = new BattleEventProcessor();

    await processor.handle(createBattleStartEvent());
    await processor.handle({ f: { endBattle: 1, m: ["omega"] } });

    expect(fixture.battles()).toHaveLength(1);
    expect(await fixture.battles()[0]?.text()).toBe(
      '{"accountId":"67890","characterId":"12345","submissionId":"07d2abdf7167ebc04c5968489e8039f6a9dd9ea89bae26777ec2433b5a5831d1","events":[{"f":{"m":["alpha"],"init":"1","w":{"111":{"icon":"one.gif","lvl":100,"name":"Player1","originalId":111,"prof":"w","team":1},"222":{"icon":"two.gif","lvl":101,"name":"Player2","originalId":222,"prof":"m","team":2}}}},{"f":{"m":["omega"],"endBattle":1}}],"world":"pandora"}',
    );
    expect(useBattleStore.getState().lastBattleHash).toBe(
      "90757b5e1de33a79eca635bda0f55da404fb206359ef757da52057ce2653b5f1",
    );
    expect(useBattleStore.getState().events).toEqual([]);
    expect(useBattleStore.getState().battleState).toBe("idle");
  });
});
