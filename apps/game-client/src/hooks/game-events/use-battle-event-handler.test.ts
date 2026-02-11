import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useBattleEventHandler } from "./use-battle-event-handler";
import { useBattleStore } from "@/store/game-store/battle.store";
import { NpcType } from "@/hooks/api/use-npcs";
import type { GameEvent } from "@/types/margonem/game-events/game-event";

const mockCreateBattle = vi.fn();
const mockCreateKill = vi.fn();

vi.mock("@/hooks/api/use-create-battle", () => ({
  useCreateBattle: () => ({ mutate: mockCreateBattle }),
}));

vi.mock("@/hooks/api/use-create-kill", () => ({
  useCreateKill: () => ({ mutate: mockCreateKill }),
}));

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
  addAccountIdsToWarriors: vi.fn().mockImplementation((warriors) => warriors),
}));

const mockBattlePanelStore = {
  isBattleCollectionEnabled: true,
};

vi.mock("@/store/battle-panel.store", () => ({
  useBattlePanelStore: {
    getState: () => mockBattlePanelStore,
  },
}));

describe("useBattleEventHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBattleStore.setState({
      events: [],
      battleState: "idle",
      lastBattleHash: "",
      lastKillHash: "",
      battleWarriors: {},
    });
    mockBattlePanelStore.isBattleCollectionEnabled = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("battle initialization", () => {
    it("should clear events and set battle state on init", async () => {
      const { result } = renderHook(() => useBattleEventHandler());

      const initEvent: GameEvent = {
        f: { init: "1" },
      };

      await result.current.handleBattleEvents(initEvent);

      const state = useBattleStore.getState();
      expect(state.battleState).toBe("in-battle");
      expect(state.events).toHaveLength(1);
    });

    it("should do nothing if event.f is undefined", async () => {
      const { result } = renderHook(() => useBattleEventHandler());

      const emptyEvent: GameEvent = {};

      await result.current.handleBattleEvents(emptyEvent);

      const state = useBattleStore.getState();
      expect(state.battleState).toBe("idle");
    });
  });

  describe("warrior updates", () => {
    it("should update battle warriors when event.f.w is present", async () => {
      const { result } = renderHook(() => useBattleEventHandler());

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

      await result.current.handleBattleEvents(warriorEvent);

      const state = useBattleStore.getState();
      expect(state.battleWarriors["12345"]).toBeDefined();
    });
  });

  describe("battle collection disabled", () => {
    it("should not add events when battle collection is disabled", async () => {
      mockBattlePanelStore.isBattleCollectionEnabled = false;
      const { result } = renderHook(() => useBattleEventHandler());

      const event: GameEvent = {
        f: { init: "1" },
      };

      await result.current.handleBattleEvents(event);

      const state = useBattleStore.getState();
      expect(state.events).toHaveLength(0);
    });
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

      const { result } = renderHook(() => useBattleEventHandler());

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await result.current.handleBattleEvents(endEvent);

      expect(mockCreateBattle).toHaveBeenCalledWith({
        accountId: "67890",
        characterId: "12345",
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

      const { result } = renderHook(() => useBattleEventHandler());

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await result.current.handleBattleEvents(endEvent);

      expect(mockCreateBattle).not.toHaveBeenCalled();
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

      const { result } = renderHook(() => useBattleEventHandler());

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await result.current.handleBattleEvents(endEvent);

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
          } as any,
        },
      });

      const { result } = renderHook(() => useBattleEventHandler());

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await result.current.handleBattleEvents(endEvent);

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

      const { result } = renderHook(() => useBattleEventHandler());

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await result.current.handleBattleEvents(endEvent);

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

      const { result } = renderHook(() => useBattleEventHandler());

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await result.current.handleBattleEvents(endEvent);

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

      const { result } = renderHook(() => useBattleEventHandler());

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await result.current.handleBattleEvents(endEvent);

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

      const { result } = renderHook(() => useBattleEventHandler());

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await result.current.handleBattleEvents(endEvent);

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

      const { result } = renderHook(() => useBattleEventHandler());

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await result.current.handleBattleEvents(endEvent);

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

      const { result } = renderHook(() => useBattleEventHandler());

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await result.current.handleBattleEvents(endEvent);

      expect(mockCreateKill).not.toHaveBeenCalled();
    });
  });

  describe("duplicate battle detection", () => {
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

      const { result } = renderHook(() => useBattleEventHandler());

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await result.current.handleBattleEvents(endEvent);

      expect(mockCreateKill).not.toHaveBeenCalled();
      expect(mockCreateBattle).not.toHaveBeenCalled();
    });
  });

  describe("battle state management", () => {
    it("should reset battle state after end battle", async () => {
      useBattleStore.setState({
        battleState: "in-battle",
        lastBattleHash: "",
        events: [{ f: { m: ["turn1"] } }],
        battleWarriors: {},
      });

      const { result } = renderHook(() => useBattleEventHandler());

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await result.current.handleBattleEvents(endEvent);

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

      const { result } = renderHook(() => useBattleEventHandler());

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await result.current.handleBattleEvents(endEvent);

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

      const { result } = renderHook(() => useBattleEventHandler());

      const endEvent: GameEvent = {
        f: { endBattle: 1, m: ["final"] },
      };

      await result.current.handleBattleEvents(endEvent);

      expect(mockCreateKill).not.toHaveBeenCalled();
      expect(mockCreateBattle).not.toHaveBeenCalled();
    });
  });
});

describe("TRACKABLE_NPC_TYPES", () => {
  it("should include correct NPC types", () => {
    const trackableTypes = new Set([
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
