import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBattleStore } from "@/store/game-store/battle.store";
import { useDialogStore } from "@/store/game-store/dialog.store";
import { useLootStore } from "@/store/game-store/loot.store";
import { LootEventProcessor } from "./loot-event-processor";
import type { GameEvent } from "@lootlog/margonem/game-events";

const { mockCreateLoot, mockGetLoot, mockGetBattleParticipants, mockGame } =
  vi.hoisted(() => ({
    mockCreateLoot: vi.fn(),
    mockGetLoot: vi.fn(),
    mockGetBattleParticipants: vi.fn(),
    mockGame: {
      hero: {
        id: 101,
        account: 202,
        nick: "Tester",
        lvl: 230,
        prof: "w",
        img: "hero.gif",
        warrior_stats: {
          hp: 500,
          maxhp: 1000,
        },
      },
      map: {
        name: "Ithan",
      },
      getWorldName: vi.fn(() => "pandora"),
      getNpc: vi.fn(),
    },
  }));

vi.mock("@/api", async (importOriginal) => {
  const originalModule = await importOriginal<typeof import("@/api")>();

  return {
    ...originalModule,
    createLoot: (...args: unknown[]) => mockCreateLoot(...args),
  };
});

vi.mock("@/utils/game/get-loots", () => ({
  getLoot: (...args: unknown[]) => mockGetLoot(...args),
}));

vi.mock("@/utils/game/get-battle-participants", () => ({
  getBattleParticipants: (...args: unknown[]) =>
    mockGetBattleParticipants(...args),
}));

vi.mock("@/lib/game", () => ({
  Game: mockGame,
}));

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
};

const createBattleWarrior = () => ({
  id: 1,
  originalId: 1,
  name: "Tester",
  icon: "hero.gif",
  hpp: 100,
  prof: "w",
  lvl: 230,
  wt: 0,
  type: 0,
  team: 1,
});

const createBattleLootEvent = (): GameEvent =>
  ({
    f: {},
    item: {
      "1": {
        tpl: 1,
      },
    },
    loot: {
      source: "fight",
      states: {},
    },
  }) as unknown as GameEvent;

const createDialogLootEvent = (npcIds?: number[]): GameEvent =>
  ({
    item: {
      "1": {
        tpl: 1,
      },
    },
    loot: {
      source: "dialog",
      states: {},
    },
    npcs_del: npcIds?.map((id) => ({ id })),
  }) as unknown as GameEvent;

const createGameNpc = (id: number, nick: string) => ({
  id,
  tpl: id,
  x: 1,
  y: 1,
  icon: "npc.gif",
  nick,
  prof: "m",
  type: 3,
  wt: 90,
  lvl: 240,
});

describe("LootEventProcessor", () => {
  let processor: LootEventProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new LootEventProcessor();
    useBattleStore.setState({
      events: [],
      battleState: "idle",
      lastBattleHash: "",
      lastKillHash: "",
      battleWarriors: {},
    });
    useLootStore.setState({
      lastLootId: 44,
    });
    useDialogStore.setState({
      talkingNpcId: null,
    });
  });

  it("ignores battle loot when item is missing or source is not fight", () => {
    processor.handleLootFromBattle({});
    processor.handleLootFromBattle(createDialogLootEvent());

    expect(mockCreateLoot).not.toHaveBeenCalled();
    expect(useLootStore.getState().lastLootId).toBe(44);
  });

  it("ignores battle loot when there are no tracked battle warriors", () => {
    processor.handleLootFromBattle(createBattleLootEvent());

    expect(mockCreateLoot).not.toHaveBeenCalled();
    expect(useLootStore.getState().lastLootId).toBe(44);
  });

  it("creates loot from battle and stores returned loot id", async () => {
    useBattleStore.setState({
      battleWarriors: {
        "1": createBattleWarrior(),
      },
    });
    mockGetLoot.mockReturnValue([
      {
        id: 1,
        name: "Legendarny miecz",
      },
    ]);
    mockGetBattleParticipants.mockReturnValue({
      npcs: [{ id: 501, name: "Boss" }],
      party: [{ id: 101, name: "Tester" }],
    });
    mockCreateLoot.mockResolvedValue({
      id: 999,
    });

    processor.handleLootFromBattle(createBattleLootEvent());

    expect(useLootStore.getState().lastLootId).toBeNull();

    await Promise.resolve();
    await Promise.resolve();

    expect(mockGetBattleParticipants).toHaveBeenCalledWith(
      useBattleStore.getState().battleWarriors,
    );
    expect(mockCreateLoot).toHaveBeenCalledWith({
      world: "pandora",
      source: "FIGHT",
      location: "Ithan",
      npcs: [{ id: 501, name: "Boss" }],
      loots: [{ id: 1, name: "Legendarny miecz" }],
      players: [{ id: 101, name: "Tester" }],
      accountId: "202",
      characterId: "101",
    });
    expect(useLootStore.getState().lastLootId).toBe(999);
  });

  it("stops battle loot creation when parsed loot list is empty", () => {
    useBattleStore.setState({
      battleWarriors: {
        "1": createBattleWarrior(),
      },
    });
    mockGetLoot.mockReturnValue([]);

    processor.handleLootFromBattle(createBattleLootEvent());

    expect(mockCreateLoot).not.toHaveBeenCalled();
    expect(useLootStore.getState().lastLootId).toBeNull();
  });

  it("logs warning when battle loot request fails", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    useBattleStore.setState({
      battleWarriors: {
        "1": createBattleWarrior(),
      },
    });
    mockGetLoot.mockReturnValue([{ id: 1 }]);
    mockGetBattleParticipants.mockReturnValue({
      npcs: [{ id: 501 }],
      party: [{ id: 101 }],
    });
    mockCreateLoot.mockRejectedValue(new Error("battle failed"));

    processor.handleLootFromBattle(createBattleLootEvent());

    await Promise.resolve();
    await Promise.resolve();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[LootEventProcessor] Failed to create loot:",
      expect.any(Error),
    );
  });

  it("ignores dialog loot without tracked npc", () => {
    processor.handleDialogLoot(createDialogLootEvent());

    expect(mockCreateLoot).not.toHaveBeenCalled();
    expect(useLootStore.getState().lastLootId).toBe(44);
  });

  it("creates dialog loot using npcs_del payload", async () => {
    useDialogStore.setState({
      talkingNpcId: "501",
    });
    mockGetLoot.mockReturnValue([{ id: 7, name: "Łup" }]);
    mockGame.getNpc.mockReturnValue(createGameNpc(501, "Mokra bestia"));
    mockCreateLoot.mockResolvedValue({
      id: 321,
    });

    processor.handleDialogLoot(createDialogLootEvent([501]));

    expect(useLootStore.getState().lastLootId).toBeNull();

    await Promise.resolve();
    await Promise.resolve();

    expect(mockCreateLoot).toHaveBeenCalledWith({
      world: "pandora",
      source: "DIALOG",
      location: "Ithan",
      loots: [{ id: 7, name: "Łup" }],
      npcs: [
        {
          icon: "npc.gif",
          id: 501,
          name: "Mokra bestia",
          prof: "m",
          hpp: 0,
          type: 3,
          wt: 90,
          lvl: 240,
          location: "Ithan",
        },
      ],
      players: [
        {
          id: 101,
          name: "Tester",
          icon: "hero.gif",
          prof: "w",
          hpp: 50,
          lvl: 230,
          accountId: 202,
        },
      ],
      accountId: "202",
      characterId: "101",
    });
    expect(useLootStore.getState().lastLootId).toBe(321);
  });

  it("falls back to talking npc id when dialog event has no npcs_del", async () => {
    useDialogStore.setState({
      talkingNpcId: "777",
    });
    mockGetLoot.mockReturnValue([{ id: 7 }]);
    mockGame.getNpc.mockImplementation((npcId: number) => {
      if (npcId === 777) {
        return {
          ...createGameNpc(777, "Strażnik"),
          prof: "h",
          type: 2,
          wt: 30,
          lvl: 120,
        };
      }

      return undefined;
    });
    mockCreateLoot.mockResolvedValue({
      id: 123,
    });

    processor.handleDialogLoot(createDialogLootEvent());

    await Promise.resolve();
    await Promise.resolve();

    expect(mockGame.getNpc).toHaveBeenCalledWith(777);
    expect(mockCreateLoot).toHaveBeenCalledTimes(1);
  });

  it("does not create dialog loot when npc lookup returns empty data", () => {
    useDialogStore.setState({
      talkingNpcId: "777",
    });
    mockGetLoot.mockReturnValue([{ id: 7 }]);
    mockGame.getNpc.mockReturnValue(undefined);

    processor.handleDialogLoot(createDialogLootEvent());

    expect(mockCreateLoot).not.toHaveBeenCalled();
    expect(useLootStore.getState().lastLootId).toBeNull();
  });

  it("logs warning when dialog loot request fails", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    useDialogStore.setState({
      talkingNpcId: "501",
    });
    mockGetLoot.mockReturnValue([{ id: 7 }]);
    mockGame.getNpc.mockReturnValue(createGameNpc(501, "Mokra bestia"));
    mockCreateLoot.mockRejectedValue(new Error("dialog failed"));

    processor.handleDialogLoot(createDialogLootEvent([501]));

    await Promise.resolve();
    await Promise.resolve();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[LootEventProcessor] Failed to create dialog loot:",
      expect.any(Error),
    );
  });

  it("does not clear tracked id when dialog source is not used", () => {
    processor.handleDialogLoot(createBattleLootEvent());

    expect(useLootStore.getState().lastLootId).toBe(44);
  });
});
