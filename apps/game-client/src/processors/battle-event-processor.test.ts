import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BattleEventProcessor } from "./battle-event-processor";
import { useBattleStore } from "@/store/game-store/battle.store";
import { NpcType } from "@/api/npcs.api";
import type { GameEvent } from "@lootlog/margonem/game-events";
import type * as ApiModule from "@/api";
import { useGameStore } from "@/store/game.store";

const mockCreateKill = vi.fn().mockResolvedValue({ updated: 1 });
const mockCreateBattle = vi.fn().mockResolvedValue({ battleId: 1 });

vi.mock("@/api", async (importOriginal) => {
  const originalModule = await importOriginal<typeof ApiModule>();

  return {
    ...originalModule,
    createKill: (...args: unknown[]) => mockCreateKill(...args),
    createBattle: (...args: unknown[]) => mockCreateBattle(...args),
  };
});

vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), {
    success: vi.fn(),
  });

  return { toast };
});

vi.mock("@/lib/game", () => ({
  Game: {
    hero: {
      id: 12345,
      account: 67890,
      nick: "TestPlayer",
      lvl: 500,
      prof: "w",
      img: "player.gif",
    },
    getWorldName: () => "pandora",
  },
}));

vi.mock("@/helpers/create-sha-256-hash", () => ({
  createSHA256Hash: vi.fn().mockResolvedValue("mock-hash-123"),
}));

vi.mock("@/helpers/mappers/battlelog.mappers", () => ({
  mapBattleEventsToPayload: vi.fn().mockReturnValue({ mapped: true }),
}));

vi.mock("@/hooks/game-events/helpers/battle.helpers", () => ({
  mergeBattleWarriorPatches: vi.fn().mockImplementation((warriors) => warriors),
}));

const mockBattlePanelStore = {
  isBattleCollectionEnabled: true,
};

vi.mock("@/store/battle-panel.store", () => ({
  useBattlePanelStore: {
    getState: () => mockBattlePanelStore,
  },
}));

describe("BattleEventProcessor", () => {
  let processor: BattleEventProcessor;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { createSHA256Hash } = await import("@/helpers/create-sha-256-hash");
    vi.mocked(createSHA256Hash).mockReset().mockResolvedValue("mock-hash-123");
    processor = new BattleEventProcessor();
    useBattleStore.getState().clearEvents();
    useBattleStore.setState({
      events: [],
      battleState: "idle",
      lastBattleHash: "",
      lastKillHash: "",
      battleWarriors: {},
    });
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "67890",
        characterId: "12345",
        currentHp: 1,
        icon: "player.gif",
        level: 500,
        maxHp: 1,
        name: "TestPlayer",
        profession: "w",
        x: 1,
        y: 2,
      },
      interface: "ni",
      map: { id: 1, name: "Map", visibility: 30 },
      world: "pandora",
    });
    mockBattlePanelStore.isBattleCollectionEnabled = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("battle initialization", () => {
    it("should clear events and set battle state on init", async () => {
      const initEvent: GameEvent = {
        f: { init: "1" },
      };

      await processor.handle(initEvent);

      const state = useBattleStore.getState();
      expect(state.battleState).toBe("in-battle");
      expect(state.events).toHaveLength(1);
    });

    it("should do nothing if event.f is undefined", async () => {
      const emptyEvent: GameEvent = {};

      await processor.handle(emptyEvent);

      const state = useBattleStore.getState();
      expect(state.battleState).toBe("idle");
    });

    it("publishes one store transaction for a combined init and warrior event", async () => {
      let publications = 0;
      const unsubscribe = useBattleStore.subscribe(() => {
        publications += 1;
      });

      await processor.handle({
        f: {
          init: "1",
          w: {
            "12345": {
              id: 12345,
              originalId: 12345,
              name: "Player1",
              lvl: 100,
              hpp: 100,
              team: 1,
              icon: "icon.gif",
              prof: "w",
              wt: 0,
              type: 0,
            },
          },
        },
      });

      unsubscribe();
      expect(publications).toBe(1);
    });
  });

  describe("warrior updates", () => {
    it("should update battle warriors when event.f.w is present", async () => {
      const warriorEvent: GameEvent = {
        f: {
          w: {
            "12345": {
              id: 12345,
              originalId: 12345,
              name: "Player1",
              lvl: 100,
              hpp: 100,
              team: 1,
              icon: "icon.gif",
              prof: "w",
              wt: 0,
              type: 0,
            },
          },
        },
      };

      await processor.handle(warriorEvent);

      const state = useBattleStore.getState();
      expect(state.battleWarriors["12345"]).toBeDefined();
    });

    it("publishes final warriors before asynchronous battle finalization", async () => {
      const { createSHA256Hash } =
        await import("@/helpers/create-sha-256-hash");
      let resolveKillHash: ((hash: string) => void) | undefined;
      const pendingKillHash = new Promise<string>((resolve) => {
        resolveKillHash = resolve;
      });
      vi.mocked(createSHA256Hash)
        .mockImplementationOnce(() => pendingKillHash)
        .mockResolvedValue("battle-hash");
      useBattleStore.setState({ battleState: "in-battle" });

      const pendingFinalization = processor.handle({
        f: {
          endBattle: 1,
          m: ["final"],
          w: {
            "-100": {
              id: -100,
              originalId: -100,
              name: "Boss",
              team: 2,
              hpp: 0,
              lvl: 300,
              icon: "boss.gif",
              prof: "w",
              wt: 85,
              type: 2,
            },
          },
        },
      });

      expect(useBattleStore.getState().battleWarriors["-100"]).toEqual(
        expect.objectContaining({ name: "Boss", hpp: 0 }),
      );

      resolveKillHash?.("kill-hash");
      await pendingFinalization;
    });
  });

  describe("battle collection disabled", () => {
    it("should not add events when battle collection is disabled", async () => {
      mockBattlePanelStore.isBattleCollectionEnabled = false;

      const event: GameEvent = {
        f: { init: "1" },
      };

      await processor.handle(event);

      const state = useBattleStore.getState();
      expect(state.events).toHaveLength(0);
    });
  });

  describe("battle capture limits", () => {
    it("never submits a partial battle after the capture overflows", async () => {
      const oversizedTurn = "x".repeat(2_700_000);

      await processor.handle({
        f: {
          init: "1",
          m: [oversizedTurn],
          w: {
            "111": {
              id: 111,
              originalId: 111,
              name: "Player1",
              team: 1,
              hpp: 100,
              lvl: 100,
              icon: "",
              prof: "w",
              wt: 0,
              type: 0,
            },
            "222": {
              id: 222,
              originalId: 222,
              name: "Player2",
              team: 2,
              hpp: 100,
              lvl: 100,
              icon: "",
              prof: "m",
              wt: 0,
              type: 0,
            },
          },
        },
      });

      await processor.handle({ f: { endBattle: 1, m: ["final"] } });

      expect(mockCreateBattle).not.toHaveBeenCalled();
      expect(useBattleStore.getState().events).toEqual([]);
      expect(useBattleStore.getState().battleState).toBe("idle");
    });
  });

  it("publishes one final store transaction for an end event", async () => {
    useBattleStore.setState({ battleState: "in-battle" });
    let publications = 0;
    const unsubscribe = useBattleStore.subscribe(() => {
      publications += 1;
    });

    await processor.handle({ f: { endBattle: 1, m: ["final"] } });

    unsubscribe();
    expect(publications).toBe(1);
    expect(useBattleStore.getState().battleState).toBe("idle");
  });

  describe("end battle - PvP", () => {
    it("should create battle for PvP (no negative IDs, multiple teams)", async () => {
      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [
          {
            f: {
              w: {
                "111": {
                  id: 111,
                  originalId: 111,
                  name: "Player1",
                  team: 1,
                  hpp: 100,
                  lvl: 100,
                  icon: "",
                  prof: "w",
                  wt: 0,
                  type: 0,
                },
                "222": {
                  id: 222,
                  originalId: 222,
                  name: "Player2",
                  team: 2,
                  hpp: 0,
                  lvl: 100,
                  icon: "",
                  prof: "m",
                  wt: 0,
                  type: 0,
                },
              },
              m: ["turn1"],
            },
          },
        ],
        battleWarriors: {},
      });

      // Simulate warrior event to trigger incremental team detection
      const warriorEvent: GameEvent = {
        f: {
          w: {
            "111": {
              id: 111,
              originalId: 111,
              name: "Player1",
              team: 1,
              hpp: 100,
              lvl: 100,
              icon: "",
              prof: "w",
              wt: 0,
              type: 0,
            },
            "222": {
              id: 222,
              originalId: 222,
              name: "Player2",
              team: 2,
              hpp: 0,
              lvl: 100,
              icon: "",
              prof: "m",
              wt: 0,
              type: 0,
            },
          },
        },
      };
      await processor.handle(warriorEvent);

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await processor.handle(endEvent);

      expect(mockCreateBattle).toHaveBeenCalledWith({
        accountId: "67890",
        characterId: "12345",
        submissionId: "mock-hash-123",
        world: "pandora",
        events: { mapped: true },
      });
      expect(mockCreateKill).not.toHaveBeenCalled();
    });

    it("should not create battle if only one team", async () => {
      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [
          {
            f: {
              w: {
                "111": {
                  id: 111,
                  originalId: 111,
                  name: "Player1",
                  team: 1,
                  hpp: 100,
                  lvl: 100,
                  icon: "",
                  prof: "w",
                  wt: 0,
                  type: 0,
                },
                "222": {
                  id: 222,
                  originalId: 222,
                  name: "Player2",
                  team: 1,
                  hpp: 100,
                  lvl: 100,
                  icon: "",
                  prof: "m",
                  wt: 0,
                  type: 0,
                },
              },
              m: ["turn1"],
            },
          },
        ],
        battleWarriors: {},
      });

      // Simulate warrior event — same team
      const warriorEvent: GameEvent = {
        f: {
          w: {
            "111": {
              id: 111,
              originalId: 111,
              name: "Player1",
              team: 1,
              hpp: 100,
              lvl: 100,
              icon: "",
              prof: "w",
              wt: 0,
              type: 0,
            },
            "222": {
              id: 222,
              originalId: 222,
              name: "Player2",
              team: 1,
              hpp: 100,
              lvl: 100,
              icon: "",
              prof: "m",
              wt: 0,
              type: 0,
            },
          },
        },
      };
      await processor.handle(warriorEvent);

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await processor.handle(endEvent);

      expect(mockCreateBattle).not.toHaveBeenCalled();
    });

    it("should log warning when battle creation fails", async () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);
      mockCreateBattle.mockRejectedValueOnce(new Error("battle failed"));

      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [
          {
            f: {
              w: {
                "111": {
                  id: 111,
                  originalId: 111,
                  name: "Player1",
                  team: 1,
                  hpp: 100,
                  lvl: 100,
                  icon: "",
                  prof: "w",
                  wt: 0,
                  type: 0,
                },
                "222": {
                  id: 222,
                  originalId: 222,
                  name: "Player2",
                  team: 2,
                  hpp: 0,
                  lvl: 100,
                  icon: "",
                  prof: "m",
                  wt: 0,
                  type: 0,
                },
              },
              m: ["turn1"],
            },
          },
        ],
        battleWarriors: {},
      });

      await processor.handle({
        f: {
          w: {
            "111": {
              id: 111,
              originalId: 111,
              name: "Player1",
              team: 1,
              hpp: 100,
              lvl: 100,
              icon: "",
              prof: "w",
              wt: 0,
              type: 0,
            },
            "222": {
              id: 222,
              originalId: 222,
              name: "Player2",
              team: 2,
              hpp: 0,
              lvl: 100,
              icon: "",
              prof: "m",
              wt: 0,
              type: 0,
            },
          },
        },
      });

      await processor.handle({
        f: { endBattle: 1, m: ["final"] },
      });
      await Promise.resolve();
      await Promise.resolve();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[BattleEventProcessor] Failed to create battle:",
        expect.any(Error),
      );
    });
  });

  describe("end battle - PvE with kill tracking", () => {
    it("should track kill for highest wt NPC when ELITE2+", async () => {
      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [
          {
            f: {
              w: {
                "-100": {
                  id: -100,
                  originalId: -100,
                  name: "Boss",
                  team: 2,
                  hpp: 0,
                  lvl: 300,
                  icon: "boss.gif",
                  prof: "w",
                  wt: 85,
                  type: 2,
                },
              },
              m: ["turn1"],
            },
          },
        ],
        battleWarriors: {
          "-100": {
            id: -100,
            originalId: -100,
            name: "Boss",
            team: 2,
            hpp: 0,
            lvl: 300,
            icon: "boss.gif",
            prof: "w",
            wt: 85,
            type: 2,
          },
        },
      });

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await processor.handle(endEvent);

      expect(mockCreateKill).toHaveBeenCalledWith({
        world: "pandora",
        npc: {
          id: -100,
          name: "Boss",
          lvl: 300,
          prof: "w",
          icon: "boss.gif",
          wt: 85,
        },
        characterId: "12345",
        accountId: "67890",
      });
    });

    it("should track kill when npc hp is sent as string 0.00", async () => {
      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [
          {
            f: {
              m: ["turn1"],
            },
          },
        ],
        battleWarriors: {
          "-100": {
            id: -100,
            originalId: -100,
            name: "Boss",
            team: 2,
            hpp: "0.00",
            hp: {
              cur: 0,
              hpp: "0.00",
            },
            lvl: 300,
            icon: "boss.gif",
            prof: "w",
            wt: 85,
            type: 2,
          } as never,
        },
      });

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await processor.handle(endEvent);

      expect(mockCreateKill).toHaveBeenCalledWith({
        world: "pandora",
        npc: {
          id: -100,
          name: "Boss",
          lvl: 300,
          prof: "w",
          icon: "boss.gif",
          wt: 85,
        },
        characterId: "12345",
        accountId: "67890",
      });
    });

    it("should only track highest wt NPC when multiple NPCs die", async () => {
      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [
          {
            f: {
              w: {
                "-100": {
                  id: -100,
                  originalId: -100,
                  name: "Minion",
                  team: 2,
                  hpp: 0,
                  lvl: 100,
                  icon: "minion.gif",
                  prof: "",
                  wt: 25,
                  type: 1,
                },
                "-200": {
                  id: -200,
                  originalId: -200,
                  name: "Boss",
                  team: 2,
                  hpp: 0,
                  lvl: 300,
                  icon: "boss.gif",
                  prof: "w",
                  wt: 100,
                  type: 2,
                },
                "-300": {
                  id: -300,
                  originalId: -300,
                  name: "Elite",
                  team: 2,
                  hpp: 0,
                  lvl: 200,
                  icon: "elite.gif",
                  prof: "m",
                  wt: 50,
                  type: 2,
                },
              },
              m: ["turn1"],
            },
          },
        ],
        battleWarriors: {
          "-100": {
            id: -100,
            originalId: -100,
            name: "Minion",
            team: 2,
            hpp: 0,
            lvl: 100,
            icon: "minion.gif",
            prof: "",
            wt: 25,
            type: 1,
          },
          "-200": {
            id: -200,
            originalId: -200,
            name: "Boss",
            team: 2,
            hpp: 0,
            lvl: 300,
            icon: "boss.gif",
            prof: "w",
            wt: 100,
            type: 2,
          },
          "-300": {
            id: -300,
            originalId: -300,
            name: "Elite",
            team: 2,
            hpp: 0,
            lvl: 200,
            icon: "elite.gif",
            prof: "m",
            wt: 50,
            type: 2,
          },
        },
      });

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await processor.handle(endEvent);

      expect(mockCreateKill).toHaveBeenCalledTimes(1);
      expect(mockCreateKill).toHaveBeenCalledWith(
        expect.objectContaining({
          npc: expect.objectContaining({
            name: "Boss",
            wt: 100,
          }),
        }),
      );
    });

    it("should NOT track kill for COMMON NPCs (wt <= 9)", async () => {
      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [
          {
            f: {
              w: {
                "-100": {
                  id: -100,
                  originalId: -100,
                  name: "Rat",
                  team: 2,
                  hpp: 0,
                  lvl: 5,
                  icon: "rat.gif",
                  prof: "",
                  wt: 5,
                  type: 1,
                },
              },
              m: ["turn1"],
            },
          },
        ],
        battleWarriors: {
          "-100": {
            id: -100,
            originalId: -100,
            name: "Rat",
            team: 2,
            hpp: 0,
            lvl: 5,
            icon: "rat.gif",
            prof: "",
            wt: 5,
            type: 1,
          },
        },
      });

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await processor.handle(endEvent);

      expect(mockCreateKill).not.toHaveBeenCalled();
    });

    it("should NOT track kill for ELITE NPCs (wt 10-19)", async () => {
      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [
          {
            f: {
              w: {
                "-100": {
                  id: -100,
                  originalId: -100,
                  name: "Elite Rat",
                  team: 2,
                  hpp: 0,
                  lvl: 20,
                  icon: "elite.gif",
                  prof: "w",
                  wt: 15,
                  type: 1,
                },
              },
              m: ["turn1"],
            },
          },
        ],
        battleWarriors: {
          "-100": {
            id: -100,
            originalId: -100,
            name: "Elite Rat",
            team: 2,
            hpp: 0,
            lvl: 20,
            icon: "elite.gif",
            prof: "w",
            wt: 15,
            type: 1,
          },
        },
      });

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await processor.handle(endEvent);

      expect(mockCreateKill).not.toHaveBeenCalled();
    });

    it("should track kill for ELITE2 NPCs (wt 20-29)", async () => {
      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [
          {
            f: {
              w: {
                "-100": {
                  id: -100,
                  originalId: -100,
                  name: "Elite2 Boss",
                  team: 2,
                  hpp: 0,
                  lvl: 50,
                  icon: "e2.gif",
                  prof: "w",
                  wt: 25,
                  type: 2,
                },
              },
              m: ["turn1"],
            },
          },
        ],
        battleWarriors: {
          "-100": {
            id: -100,
            originalId: -100,
            name: "Elite2 Boss",
            team: 2,
            hpp: 0,
            lvl: 50,
            icon: "e2.gif",
            prof: "w",
            wt: 25,
            type: 2,
          },
        },
      });

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await processor.handle(endEvent);

      expect(mockCreateKill).toHaveBeenCalledTimes(1);
    });

    it("should track kill for TITAN NPCs (wt > 99)", async () => {
      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [
          {
            f: {
              w: {
                "-100": {
                  id: -100,
                  originalId: -100,
                  name: "Titan Boss",
                  team: 2,
                  hpp: 0,
                  lvl: 500,
                  icon: "titan.gif",
                  prof: "w",
                  wt: 150,
                  type: 2,
                },
              },
              m: ["turn1"],
            },
          },
        ],
        battleWarriors: {
          "-100": {
            id: -100,
            originalId: -100,
            name: "Titan Boss",
            team: 2,
            hpp: 0,
            lvl: 500,
            icon: "titan.gif",
            prof: "w",
            wt: 150,
            type: 2,
          },
        },
      });

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await processor.handle(endEvent);

      expect(mockCreateKill).toHaveBeenCalledTimes(1);
    });

    it("should not track alive NPCs (hpp > 0)", async () => {
      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [
          {
            f: {
              w: {
                "-100": {
                  id: -100,
                  originalId: -100,
                  name: "Boss",
                  team: 2,
                  hpp: 50,
                  lvl: 300,
                  icon: "boss.gif",
                  prof: "w",
                  wt: 85,
                  type: 2,
                },
              },
              m: ["turn1"],
            },
          },
        ],
        battleWarriors: {
          "-100": {
            id: -100,
            originalId: -100,
            name: "Boss",
            team: 2,
            hpp: 50,
            lvl: 300,
            icon: "boss.gif",
            prof: "w",
            wt: 85,
            type: 2,
          },
        },
      });

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await processor.handle(endEvent);

      expect(mockCreateKill).not.toHaveBeenCalled();
    });

    it("should track kill when npc current hp is sent as string 0", async () => {
      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [
          {
            f: {
              m: ["turn1"],
            },
          },
        ],
        battleWarriors: {
          "-100": {
            id: -100,
            originalId: -100,
            name: "Boss",
            team: 2,
            hp: {
              cur: "0",
            },
            lvl: 300,
            icon: "boss.gif",
            prof: "w",
            wt: 85,
            type: 2,
          } as never,
        },
      });

      await processor.handle({
        f: { endBattle: 1, m: ["final"] },
      });

      expect(mockCreateKill).toHaveBeenCalledTimes(1);
    });

    it("should ignore npc when hp values cannot be parsed", async () => {
      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [
          {
            f: {
              m: ["turn1"],
            },
          },
        ],
        battleWarriors: {
          "-100": {
            id: -100,
            originalId: -100,
            name: "Boss",
            team: 2,
            hp: {
              cur: "invalid",
              hpp: "invalid",
            },
            lvl: 300,
            icon: "boss.gif",
            prof: "w",
            wt: 85,
            type: 2,
          } as never,
        },
      });

      await processor.handle({
        f: { endBattle: 1, m: ["final"] },
      });

      expect(mockCreateKill).not.toHaveBeenCalled();
    });

    it("should log warning when kill creation fails", async () => {
      const consoleWarnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);
      mockCreateKill.mockRejectedValueOnce(new Error("kill failed"));

      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [
          {
            f: {
              m: ["turn1"],
            },
          },
        ],
        battleWarriors: {
          "-100": {
            id: -100,
            originalId: -100,
            name: "Boss",
            team: 2,
            hpp: 0,
            lvl: 300,
            icon: "boss.gif",
            prof: "w",
            wt: 85,
            type: 2,
          },
        },
      });

      await processor.handle({
        f: { endBattle: 1, m: ["final"] },
      });
      await Promise.resolve();
      await Promise.resolve();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[BattleEventProcessor] Failed to create kill:",
        expect.any(Error),
      );
    });
  });

  describe("duplicate battle detection", () => {
    it("preserves distinct battle packets that share an event id", async () => {
      const { mapBattleEventsToPayload } =
        await import("@/helpers/mappers/battlelog.mappers");
      vi.mocked(mapBattleEventsToPayload).mockImplementation(
        (events) => events as never,
      );
      const startEvent = {
        ev: 77,
        f: {
          init: "1",
          m: ["start"],
          w: {
            "111": { id: 111, name: "One", team: 1 },
            "222": { id: 222, name: "Two", team: 2 },
          },
        },
      } as unknown as GameEvent;
      const middleEvent = {
        ev: 77,
        f: { m: ["middle"] },
      } as GameEvent;
      const endEvent = {
        ev: 78,
        f: { endBattle: 1, m: ["end"] },
      } as GameEvent;

      await processor.handle(startEvent);
      await processor.handle(middleEvent);
      await processor.handle(endEvent);

      expect(mockCreateBattle).toHaveBeenCalledWith(
        expect.objectContaining({
          events: [startEvent, middleEvent, endEvent],
        }),
      );
    });

    it("submits incremental and compact replay once", async () => {
      const { createSHA256Hash } =
        await import("@/helpers/create-sha-256-hash");
      const { mapBattleEventsToPayload } =
        await import("@/helpers/mappers/battlelog.mappers");
      vi.mocked(createSHA256Hash).mockImplementation((value) =>
        Promise.resolve(value),
      );
      vi.mocked(mapBattleEventsToPayload).mockImplementation(
        (events) => events as never,
      );
      const warriors = {
        "111": { id: 111, name: "One", team: 1 },
        "222": { id: 222, name: "Two", team: 2 },
      };
      const incrementalEvents = [
        {
          ev: 1,
          f: { init: "1", m: ["start"], w: warriors },
        },
        { ev: 2, f: { m: ["middle"] } },
        { ev: 3, f: { endBattle: 1, m: ["end"] } },
      ] as GameEvent[];

      await processor.handle(incrementalEvents[0]);
      await processor.handle(incrementalEvents[1]);
      await processor.handle(incrementalEvents[2]);
      await processor.handle({
        ev: 4,
        f: {
          endBattle: 1,
          init: "1",
          m: ["start", "middle", "end"],
          w: warriors,
        },
      } as unknown as GameEvent);

      expect(mockCreateBattle).toHaveBeenCalledTimes(1);
      expect(mockCreateBattle).toHaveBeenCalledWith(
        expect.objectContaining({
          events: incrementalEvents,
        }),
      );
    });

    it("should not process duplicate battles with same hash", async () => {
      const { createSHA256Hash } =
        await import("@/helpers/create-sha-256-hash");
      vi.mocked(createSHA256Hash).mockResolvedValue("duplicate-hash");

      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "duplicate-hash",
        lastKillHash: "duplicate-hash",
        events: [
          {
            f: {
              w: {
                "-100": {
                  id: -100,
                  originalId: -100,
                  name: "Boss",
                  team: 2,
                  hpp: 0,
                  lvl: 300,
                  icon: "boss.gif",
                  prof: "w",
                  wt: 85,
                  type: 2,
                },
              },
              m: ["turn1"],
            },
          },
        ],
        battleWarriors: {
          "-100": {
            id: -100,
            originalId: -100,
            name: "Boss",
            team: 2,
            hpp: 0,
            lvl: 300,
            icon: "boss.gif",
            prof: "w",
            wt: 85,
            type: 2,
          },
        },
      });

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await processor.handle(endEvent);

      expect(mockCreateKill).not.toHaveBeenCalled();
      expect(mockCreateBattle).not.toHaveBeenCalled();
    });
  });

  describe("battle state management", () => {
    it("submits one immutable snapshot while the digest is pending", async () => {
      const { createSHA256Hash } =
        await import("@/helpers/create-sha-256-hash");
      const { mapBattleEventsToPayload } =
        await import("@/helpers/mappers/battlelog.mappers");
      let resolveBattleHash: ((hash: string) => void) | undefined;
      const pendingBattleHash = new Promise<string>((resolve) => {
        resolveBattleHash = resolve;
      });
      vi.mocked(createSHA256Hash)
        .mockImplementationOnce(() => pendingBattleHash)
        .mockResolvedValue("submission-hash");
      const startEvent = {
        f: {
          init: "1",
          m: ["start"],
          w: {
            "111": { id: 111, name: "One", team: 1 },
            "222": { id: 222, name: "Two", team: 2 },
          },
        },
      } as unknown as GameEvent;
      const endEvent = { f: { endBattle: 1, m: ["end"] } } as GameEvent;

      await processor.handle(startEvent);
      const pendingEnd = processor.handle(endEvent);
      expect(createSHA256Hash).toHaveBeenCalledTimes(1);

      await processor.handle({ f: { m: ["late-turn"] } });
      await processor.handle({ f: { endBattle: 1, m: ["duplicate-end"] } });
      resolveBattleHash?.("battle-hash");
      await pendingEnd;

      expect(mapBattleEventsToPayload).toHaveBeenCalledTimes(1);
      expect(mapBattleEventsToPayload).toHaveBeenCalledWith([
        startEvent,
        endEvent,
      ]);
      expect(createSHA256Hash).toHaveBeenCalledTimes(2);
      expect(mockCreateBattle).toHaveBeenCalledTimes(1);
      expect(useBattleStore.getState().events).toEqual([]);
      expect(useBattleStore.getState().lastBattleHash).toBe("battle-hash");
    });

    it("does not overwrite a new battle when the previous finalization completes", async () => {
      const { createSHA256Hash } =
        await import("@/helpers/create-sha-256-hash");
      let resolveKillHash: ((hash: string) => void) | undefined;
      const pendingKillHash = new Promise<string>((resolve) => {
        resolveKillHash = resolve;
      });
      vi.mocked(createSHA256Hash).mockImplementationOnce(() => pendingKillHash);
      useBattleStore.setState({ battleState: "in-battle" });
      const pendingPreviousFinalization = processor.handle({
        f: {
          endBattle: 1,
          w: {
            "-100": {
              id: -100,
              originalId: -100,
              name: "Previous boss",
              team: 2,
              hpp: 0,
              lvl: 300,
              icon: "boss.gif",
              prof: "w",
              wt: 85,
              type: 2,
            },
          },
        },
      });

      await processor.handle({
        f: {
          init: "1",
          w: {
            "12345": {
              id: 12345,
              originalId: 12345,
              name: "New player",
              team: 1,
              hpp: 100,
              lvl: 300,
              icon: "player.gif",
              prof: "w",
              wt: 0,
              type: 0,
            },
          },
        },
      });
      resolveKillHash?.("previous-kill-hash");
      await pendingPreviousFinalization;

      expect(useBattleStore.getState()).toEqual(
        expect.objectContaining({
          battleState: "in-battle",
          battleWarriors: {
            "12345": expect.objectContaining({ name: "New player" }),
          },
          lastKillHash: "",
        }),
      );
      expect(mockCreateKill).not.toHaveBeenCalled();
    });

    it("should reset battle state after end battle", async () => {
      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [{ f: { m: ["turn1"] } }],
        battleWarriors: {},
      });

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await processor.handle(endEvent);

      const state = useBattleStore.getState();
      expect(state.battleState).toBe("idle");
      expect(state.events).toHaveLength(0);
    });

    it("should update lastBattleHash after processing", async () => {
      const { createSHA256Hash } =
        await import("@/helpers/create-sha-256-hash");
      vi.mocked(createSHA256Hash).mockResolvedValue("new-hash-456");

      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [{ f: { m: ["turn1"] } }],
        battleWarriors: {},
      });

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await processor.handle(endEvent);

      const state = useBattleStore.getState();
      expect(state.lastBattleHash).toBe("new-hash-456");
    });

    it("should not process endBattle if battleState is not in-battle", async () => {
      useBattleStore.setState({
        battleState: "idle",
        lastBattleHash: "",
        events: [],
        battleWarriors: {},
      });

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await processor.handle(endEvent);

      expect(mockCreateKill).not.toHaveBeenCalled();
      expect(mockCreateBattle).not.toHaveBeenCalled();
    });
  });
});

describe("TRACKABLE_NPC_TYPES", () => {
  it("should include correct NPC types", () => {
    const trackableTypes: ReadonlySet<NpcType> = new Set([
      NpcType.ELITE2,
      NpcType.ELITE3,
      NpcType.HERO,
      NpcType.COLOSSUS,
      NpcType.TITAN,
    ]);

    expect(trackableTypes.has(NpcType.ELITE2)).toBe(true);
    expect(trackableTypes.has(NpcType.ELITE3)).toBe(true);
    expect(trackableTypes.has(NpcType.HERO)).toBe(true);
    expect(trackableTypes.has(NpcType.COLOSSUS)).toBe(true);
    expect(trackableTypes.has(NpcType.TITAN)).toBe(true);

    expect(trackableTypes.has(NpcType.COMMON)).toBe(false);
    expect(trackableTypes.has(NpcType.ELITE)).toBe(false);
    expect(trackableTypes.has(NpcType.NPC)).toBe(false);
  });
});
