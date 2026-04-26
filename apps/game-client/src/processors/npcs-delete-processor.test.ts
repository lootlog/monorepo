import { beforeEach, describe, expect, it, vi } from "vitest";
import { NpcType } from "@/api/npcs.api";
import { queryClient } from "@/lib/query-client";
import { getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey } from "@/lib/api/generated/main/user-lootlog-config/user-lootlog-config";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useNotificationsStore } from "@/store/notifications.store";
import { NpcsDeleteProcessor } from "./npcs-delete-processor";

const { mockCreateAutoTimer, mockGetNpcTypeByWt, mockGame } = vi.hoisted(
  () => ({
    mockCreateAutoTimer: vi.fn(),
    mockGetNpcTypeByWt: vi.fn(),
    mockGame: {
      getWorldName: vi.fn(() => "pandora"),
      getNpc: vi.fn(),
      hero: {
        id: 101,
        account: 202,
        nick: undefined,
        lvl: undefined,
        prof: undefined,
        img: undefined,
        clan: null,
      },
      map: {
        id: 3327,
        name: "Urwisko",
      },
    },
  }),
);

vi.mock("@/api", async (importOriginal) => {
  const originalModule = await importOriginal<typeof import("@/api")>();

  return {
    ...originalModule,
    createAutoTimer: (...args: unknown[]) => mockCreateAutoTimer(...args),
  };
});

vi.mock("@lootlog/types", async (importOriginal) => {
  const originalModule =
    await importOriginal<typeof import("@lootlog/types")>();
  return {
    ...originalModule,
    getNpcTypeByWt: (...args: unknown[]) => mockGetNpcTypeByWt(...args),
  };
});

vi.mock("@/lib/game", () => ({
  Game: mockGame,
}));

const createTrackedNpc = () => ({
  id: 500,
  tpl: 500,
  x: 1,
  y: 1,
  icon: "npc.gif",
  nick: "Stwór",
  prof: "m",
  wt: 90,
  lvl: 250,
  type: 3,
  location: "Urwisko",
  notificationSent: false,
});

const createGameNpc = (
  overrides?: Partial<
    Omit<ReturnType<typeof createTrackedNpc>, "location" | "notificationSent">
  >,
) => ({
  id: 500,
  tpl: 500,
  x: 1,
  y: 1,
  icon: "npc.gif",
  nick: "Stwór",
  prof: "m",
  wt: 90,
  lvl: 250,
  type: 3,
  ...overrides,
});

describe("NpcsDeleteProcessor", () => {
  let processor: NpcsDeleteProcessor;
  const lootlogCharacterConfigQueryKey =
    getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
      accountId: "202",
    });

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    processor = new NpcsDeleteProcessor();
    mockCreateAutoTimer.mockResolvedValue({
      submittedGuilds: [],
      rejectedGuilds: [],
    });
    useNpcDetectorStore.setState({
      npcs: [createTrackedNpc()],
      activeDetectionAnimations: { 500: 1 },
      latestDetectionAnimationCycle: 1,
    });
    useNotificationsStore.setState({
      notifications: [
        {
          notificationId: "notification-1",
          listKey: "notification-1",
          receivedAtMs: Date.now(),
          servers: ["guild-1"],
          world: "pandora",
          npc: { id: 500 },
        } as never,
      ],
      notificationAutoHideByListKey: {
        "notification-1": {
          deadlineMs: null,
          pausedRemainingMs: null,
          durationMs: 1,
        },
      },
      latestNotificationAnimationCycle: 1,
    });
  });

  it("ignores events without deleted npcs", () => {
    processor.handle({});

    expect(mockCreateAutoTimer).not.toHaveBeenCalled();
  });

  it("always removes npc from local stores before further validation", () => {
    mockGame.getNpc.mockReturnValue(undefined);

    processor.handle({
      npcs_del: [{ id: 500, respBaseSeconds: 30 }],
    });

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
    expect(useNotificationsStore.getState().notifications).toEqual([]);
    expect(mockCreateAutoTimer).not.toHaveBeenCalled();
  });

  it("stops when respBaseSeconds is missing or npc weight is too low", () => {
    mockGame.getNpc.mockReturnValue({
      ...createGameNpc(),
      wt: 10,
      resp_rand: 15,
    });

    processor.handle({
      npcs_del: [{ id: 500 }],
    });
    processor.handle({
      npcs_del: [{ id: 500, respBaseSeconds: 30 }],
    });

    expect(mockCreateAutoTimer).not.toHaveBeenCalled();
  });

  it("stops when respBaseSeconds is below minimum", () => {
    mockGame.getNpc.mockReturnValue({
      ...createGameNpc(),
      resp_rand: 15,
    });

    processor.handle({
      npcs_del: [{ id: 500, respBaseSeconds: 1 }],
    });

    expect(mockCreateAutoTimer).not.toHaveBeenCalled();
  });

  it("stops when character has no whitelisted guilds", () => {
    mockGame.getNpc.mockReturnValue({
      ...createGameNpc(),
      resp_rand: 15,
    });
    mockGetNpcTypeByWt.mockReturnValue(NpcType.HERO);
    queryClient.setQueryData(lootlogCharacterConfigQueryKey, {
      "101": {
        catchingGuildIds: [],
      },
    });

    processor.handle({
      npcs_del: [{ id: 500, respBaseSeconds: 30 }],
    });

    expect(mockCreateAutoTimer).not.toHaveBeenCalled();
  });

  it("creates timer payload for whitelisted guilds", () => {
    mockGame.getNpc.mockReturnValue({
      ...createGameNpc(),
      resp_rand: 15,
    });
    mockGetNpcTypeByWt.mockReturnValue(NpcType.HERO);
    queryClient.setQueryData(lootlogCharacterConfigQueryKey, {
      "101": {
        catchingGuildIds: ["guild-1", "guild-2"],
      },
    });

    processor.handle({
      npcs_del: [{ id: 500, respBaseSeconds: 30 }],
    });

    expect(mockCreateAutoTimer).toHaveBeenCalledWith({
      respawnRandomness: 15,
      respBaseSeconds: 30,
      characterId: "101",
      accountId: "202",
      world: "pandora",
      npc: {
        icon: "npc.gif",
        id: 500,
        prof: "m",
        wt: 90,
        hpp: 0,
        type: 3,
        lvl: 250,
        name: "Stwór",
        location: "Urwisko",
      },
      character: {
        nick: undefined,
        lvl: undefined,
        prof: undefined,
        icon: undefined,
        clan: null,
      },
    });
  });

  it("uses SpecialE2 name when deleted npc is elite2 on a mapped location", () => {
    mockGame.getNpc.mockReturnValue({
      ...createGameNpc(),
      nick: "Bazowa nazwa",
      wt: 20,
      resp_rand: 15,
    });
    mockGetNpcTypeByWt.mockReturnValue(NpcType.ELITE2);
    queryClient.setQueryData(lootlogCharacterConfigQueryKey, {
      "101": {
        catchingGuildIds: ["guild-1"],
      },
    });

    processor.handle({
      npcs_del: [{ id: 500, respBaseSeconds: 30 }],
    });

    expect(mockCreateAutoTimer).toHaveBeenCalledWith(
      expect.objectContaining({
        npc: expect.objectContaining({
          name: "Terrozaur (urwisko)",
        }),
      }),
    );
  });

  it("falls back to original npc name when SpecialE2 mapping is missing", () => {
    mockGame.map.id = 9999;
    mockGame.getNpc.mockReturnValue({
      ...createGameNpc(),
      nick: "Bazowa nazwa",
      wt: 20,
      resp_rand: 15,
    });
    mockGetNpcTypeByWt.mockReturnValue(NpcType.ELITE2);
    queryClient.setQueryData(lootlogCharacterConfigQueryKey, {
      "101": {
        catchingGuildIds: ["guild-1"],
      },
    });

    processor.handle({
      npcs_del: [{ id: 500, respBaseSeconds: 30 }],
    });

    expect(mockCreateAutoTimer).toHaveBeenCalledWith(
      expect.objectContaining({
        npc: expect.objectContaining({
          name: "Bazowa nazwa",
        }),
      }),
    );
  });

  it("logs warning when timer creation fails", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    mockGame.getNpc.mockReturnValue({
      ...createGameNpc(),
      resp_rand: 15,
    });
    mockGetNpcTypeByWt.mockReturnValue(NpcType.HERO);
    queryClient.setQueryData(lootlogCharacterConfigQueryKey, {
      "101": {
        catchingGuildIds: ["guild-1"],
      },
    });
    mockCreateAutoTimer.mockRejectedValue(new Error("timer failed"));

    processor.handle({
      npcs_del: [{ id: 500, respBaseSeconds: 30 }],
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[NpcsDeleteProcessor] Failed to create timer:",
      expect.any(Error),
    );
  });
});
