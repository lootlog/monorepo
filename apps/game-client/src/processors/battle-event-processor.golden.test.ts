import type { GameEvent } from "@lootlog/margonem/game-events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBattleStore } from "@/store/game-store/battle.store";
import { BattleEventProcessor } from "./battle-event-processor";
import { useGameStore } from "@/store/game.store";

const mocks = vi.hoisted(() => ({
  createBattle: vi.fn().mockResolvedValue({ battleId: "battle-1" }),
  createKill: vi.fn().mockResolvedValue({ updated: 0 }),
}));

vi.mock("@/api", () => ({
  createBattle: mocks.createBattle,
  createKill: mocks.createKill,
}));

vi.mock("@/hooks/game-events/helpers/battle.helpers", () => ({
  mergeBattleWarriorPatches: (warriors: unknown) => warriors,
}));

vi.mock("@/lib/game", () => ({
  Game: {
    hero: { account: 67_890, id: 12_345 },
    getWorldName: () => "pandora",
  },
}));

vi.mock("@/store/battle-panel.store", () => ({
  useBattlePanelStore: {
    getState: () => ({ isBattleCollectionEnabled: true }),
  },
}));

vi.mock("@/i18n/get-fixed-t", () => ({
  getFixedT: () => (key: string) => key,
}));

vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn() });
  return { toast };
});

const createBattleStartEvent = (): GameEvent =>
  ({
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
  }) as GameEvent;

describe("BattleEventProcessor golden payload", () => {
  beforeEach(() => {
    mocks.createBattle.mockClear();
    mocks.createKill.mockClear();
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
    const processor = new BattleEventProcessor();

    await processor.handle(createBattleStartEvent());
    await processor.handle({ f: { endBattle: 1, m: ["omega"] } });

    expect(mocks.createBattle).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(mocks.createBattle.mock.calls[0]?.[0])).toBe(
      '{"accountId":"67890","characterId":"12345","submissionId":"8e0ae1f434c3eae298187f56e33f06740373d377c2c349a97b1542b51fde3e08","events":[{"f":{"m":["alpha"],"init":"1","w":{"111":{"icon":"one.gif","lvl":100,"name":"Player1","originalId":111,"prof":"w","team":1},"222":{"icon":"two.gif","lvl":101,"name":"Player2","originalId":222,"prof":"m","team":2}}}},{"f":{"m":["omega"],"endBattle":1}}],"world":"pandora"}',
    );
    expect(useBattleStore.getState().lastBattleHash).toBe(
      "90757b5e1de33a79eca635bda0f55da404fb206359ef757da52057ce2653b5f1",
    );
    expect(useBattleStore.getState().events).toEqual([]);
    expect(useBattleStore.getState().battleState).toBe("idle");
  });
});
