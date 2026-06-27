import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDetectorSettings,
  getUserGameAccountPreferencesQueryKey,
} from "@/lib/game-account-preferences";
import { queryClient } from "@/lib/query-client";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import { NpcsDetectionProcessor } from "./npcs-detection-processor";
import type { NpcTpl } from "@lootlog/margonem/npc-tpl-manager";
import type { GameNpc } from "@lootlog/margonem/npcs";
import type { GameEvent } from "@lootlog/margonem/game-events";
import type * as Api from "@/api";
import type * as LootlogTypes from "@lootlog/types";

const {
  mockCreateNotification,
  mockSendChatMessage,
  mockPlaySound,
  mockGetNpcTypeByWt,
  mockGame,
} = vi.hoisted(() => ({
  mockCreateNotification: vi.fn(),
  mockSendChatMessage: vi.fn(),
  mockPlaySound: vi.fn(),
  mockGetNpcTypeByWt: vi.fn(),
  mockGame: {
    hero: {
      id: 101,
      account: 202,
      nick: "Tester",
      lvl: 230,
      prof: "w",
      img: "hero.gif",
    },
    map: {
      name: "Ithan",
    },
    npcs: [] as GameNpc[],
    getAccountId: vi.fn(() => "202"),
    getNpcTpl: vi.fn(),
    getNpcIcon: vi.fn(),
    getWorldName: vi.fn(() => "pandora"),
  },
}));

vi.mock("@/api", async (importOriginal) => {
  const originalModule = await importOriginal<typeof Api>();

  return {
    ...originalModule,
    createNotification: (...args: unknown[]) => mockCreateNotification(...args),
    sendChatMessage: (...args: unknown[]) => mockSendChatMessage(...args),
    MessageType: {
      ...originalModule.MessageType,
      NPC: "NPC",
    },
  };
});

vi.mock("@/lib/sound-playback", () => ({
  playSound: (...args: unknown[]) => mockPlaySound(...args),
}));

vi.mock("@lootlog/types", async (importOriginal) => {
  const originalModule = await importOriginal<typeof LootlogTypes>();
  return {
    ...originalModule,
    getNpcTypeByWt: (...args: unknown[]) => mockGetNpcTypeByWt(...args),
  };
});

vi.mock("@/lib/game", () => ({
  Game: mockGame,
}));

const readyPreferences = (overrides?: {
  detect?: boolean;
  autoSend?: boolean;
  notifySound?: boolean;
  routingRules?: Array<{
    id: string;
    minLevel: number;
    maxLevel: number;
    world?: string;
    guildIds: string[];
  }>;
}) => {
  const detector = createDetectorSettings();
  detector.HERO.detect = overrides?.detect ?? true;
  detector.HERO.autoSend = overrides?.autoSend ?? false;
  detector.HERO.notifySound = overrides?.notifySound ?? false;
  detector.routingRules = overrides?.routingRules ?? [];

  queryClient.setQueryData(getUserGameAccountPreferencesQueryKey("202"), {
    accountId: "202",
    detector,
    hasStoredDetector: true,
  });
};

const createNpcEvent = (overrides?: {
  npcTpls?: NpcTpl[];
  icons?: NonNullable<GameEvent["icons"]>;
}): GameEvent =>
  ({
    npcs: [
      {
        id: 500,
        x: 12,
        y: 18,
        tpl: 900,
        icon: { id: 44 },
      },
    ],
    npc_tpls: overrides?.npcTpls ?? [createNpcTpl()],
    icons: overrides?.icons ?? [
      {
        id: 44,
        icon: "event-icon.gif",
      },
    ],
  }) as unknown as GameEvent;

const createGameNpc = (overrides?: Partial<GameNpc>): GameNpc => ({
  id: 501,
  nick: "Initial npc",
  x: 10,
  y: 11,
  tpl: 901,
  icon: "fallback-icon.gif",
  prof: "m",
  wt: 80,
  lvl: 240,
  type: 3,
  ...overrides,
});

const createNpcTpl = (overrides?: Partial<NpcTpl>): NpcTpl =>
  ({
    id: 900,
    nick: "Detected npc",
    warrior_type: 80,
    wt: 80,
    prof: "m",
    type: 3,
    level: 240,
    lvl: 240,
    elasticLevelFactor: 1,
    ...overrides,
  }) as NpcTpl;

describe("NpcsDetectionProcessor", () => {
  let processor: NpcsDetectionProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    processor = new NpcsDetectionProcessor();
    (
      NpcsDetectionProcessor as unknown as { pendingDetections: unknown[] }
    ).pendingDetections = [];
    mockGame.npcs = [];
    mockGame.getNpcTpl.mockReset();
    mockGame.getNpcIcon.mockReset();
    mockGetNpcTypeByWt.mockReset();
    mockGame.hero.account = 202;
    useNpcDetectorStore.getState().clearNpcs();
    useWindowsStore.setState((state) => ({
      ...state,
      "npc-detector": {
        ...state["npc-detector"],
        open: false,
      },
    }));
  });

  it("ignores detections when current account id is missing", () => {
    mockGame.hero.account = 0;

    processor.handle(createNpcEvent());
    processor.handleInitialDetection();

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
  });

  it("queues event until detector preferences are ready and flushes it later", () => {
    mockGetNpcTypeByWt.mockReturnValue("HERO");

    processor.handle(createNpcEvent());

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);

    readyPreferences();
    processor.flushPending("202");

    expect(useNpcDetectorStore.getState().npcs).toEqual([
      expect.objectContaining({
        id: 500,
        nick: "Detected npc",
        icon: "event-icon.gif",
        location: "Ithan",
        notificationSent: false,
      }),
    ]);
    expect(useWindowsStore.getState()["npc-detector"].open).toBe(true);
  });

  it("keeps queued events until detector preferences become available", () => {
    vi.useFakeTimers();

    try {
      mockGetNpcTypeByWt.mockReturnValue("HERO");

      processor.handle(createNpcEvent());
      vi.advanceTimersByTime(5_001);

      readyPreferences();
      processor.flushPending("202");

      expect(useNpcDetectorStore.getState().npcs).toEqual([
        expect.objectContaining({
          id: 500,
          nick: "Detected npc",
          icon: "event-icon.gif",
          location: "Ithan",
          notificationSent: false,
        }),
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not flush pending detections when preferences are still not ready", () => {
    mockGetNpcTypeByWt.mockReturnValue("HERO");

    processor.handle(createNpcEvent());
    processor.flushPending("202");

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
  });

  it("returns early when there is nothing pending to flush", () => {
    readyPreferences();

    processor.flushPending("202");

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
  });

  it("queues only one initial detection before preferences are ready", () => {
    mockGame.npcs = [createGameNpc()];
    mockGame.getNpcIcon.mockReturnValue("fallback-icon.gif");
    mockGetNpcTypeByWt.mockReturnValue("HERO");

    processor.handleInitialDetection();
    processor.handleInitialDetection();

    readyPreferences({
      notifySound: true,
    });
    processor.flushPending("202");

    expect(useNpcDetectorStore.getState().npcs).toHaveLength(1);
    expect(mockPlaySound).toHaveBeenCalledTimes(1);
  });

  it("processes initial detection immediately when preferences are ready", () => {
    readyPreferences({
      notifySound: true,
    });
    mockGame.npcs = [createGameNpc()];
    mockGame.getNpcIcon.mockReturnValue("fallback-icon.gif");
    mockGetNpcTypeByWt.mockReturnValue("HERO");

    processor.handleInitialDetection();

    expect(useNpcDetectorStore.getState().npcs).toEqual([
      expect.objectContaining({
        id: 501,
        nick: "Initial npc",
        icon: "fallback-icon.gif",
      }),
    ]);
    expect(mockPlaySound).toHaveBeenCalledWith("detector", "HERO");
  });

  it("retries initial detection when game npcs are not ready yet", () => {
    vi.useFakeTimers();

    try {
      readyPreferences({
        notifySound: true,
      });
      mockGame.npcs = [];
      mockGame.getNpcIcon.mockReturnValue("fallback-icon.gif");
      mockGetNpcTypeByWt.mockReturnValue("HERO");
      vi.clearAllTimers();

      processor.handleInitialDetection();
      processor.handleInitialDetection();

      expect(useNpcDetectorStore.getState().npcs).toEqual([]);

      mockGame.npcs = [createGameNpc()];
      vi.advanceTimersByTime(100);

      expect(useNpcDetectorStore.getState().npcs).toEqual([
        expect.objectContaining({
          id: 501,
          nick: "Initial npc",
          icon: "fallback-icon.gif",
        }),
      ]);
      expect(mockPlaySound).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps retrying initial detection while game npcs contain invalid entries", () => {
    vi.useFakeTimers();

    try {
      readyPreferences({
        notifySound: true,
      });
      mockGame.npcs = [undefined as unknown as GameNpc];
      mockGame.getNpcIcon.mockReturnValue("fallback-icon.gif");
      mockGetNpcTypeByWt.mockReturnValue("HERO");
      vi.clearAllTimers();

      processor.handleInitialDetection();

      expect(useNpcDetectorStore.getState().npcs).toEqual([]);

      mockGame.npcs = [createGameNpc()];
      vi.advanceTimersByTime(100);

      expect(useNpcDetectorStore.getState().npcs).toEqual([
        expect.objectContaining({
          id: 501,
          nick: "Initial npc",
          icon: "fallback-icon.gif",
        }),
      ]);
      expect(mockPlaySound).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops retrying initial detection after the retry limit", () => {
    vi.useFakeTimers();

    try {
      readyPreferences();
      mockGame.npcs = [];
      mockGame.getNpcIcon.mockReturnValue("fallback-icon.gif");
      mockGetNpcTypeByWt.mockReturnValue("HERO");
      vi.clearAllTimers();

      processor.handleInitialDetection();

      vi.advanceTimersByTime(2_000);

      expect(useNpcDetectorStore.getState().npcs).toEqual([]);
      expect(mockGetNpcTypeByWt).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ignores empty npc events and init packets", () => {
    readyPreferences();

    processor.handle({});
    processor.handle({
      f: { init: "1" },
      npcs: [
        {
          id: 500,
          x: 12,
          y: 18,
          tpl: 900,
          icon: { id: 44 },
        },
      ],
    } as GameEvent);

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
  });

  it("ignores detections when template is missing or detector type is disabled", () => {
    readyPreferences({
      detect: false,
    });
    mockGetNpcTypeByWt.mockReturnValue("HERO");

    processor.handle(createNpcEvent({ npcTpls: [] }));
    processor.handle(createNpcEvent());

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
    expect(mockPlaySound).not.toHaveBeenCalled();
  });

  it("uses Game fallbacks for template and icon and plays sound when configured", () => {
    readyPreferences({
      notifySound: true,
    });
    mockGetNpcTypeByWt.mockReturnValue("HERO");
    mockGame.getNpcTpl.mockReturnValue(
      createNpcTpl({
        nick: "Fallback npc",
      }),
    );
    mockGame.getNpcIcon.mockReturnValue("fallback-icon.gif");

    processor.handle(
      createNpcEvent({
        npcTpls: [],
        icons: [],
      }),
    );

    expect(useNpcDetectorStore.getState().npcs).toEqual([
      expect.objectContaining({
        id: 500,
        nick: "Fallback npc",
        icon: "fallback-icon.gif",
        notificationSent: false,
      }),
    ]);
    expect(mockPlaySound).toHaveBeenCalledWith("detector", "HERO");
    expect(mockCreateNotification).not.toHaveBeenCalled();
    expect(mockSendChatMessage).not.toHaveBeenCalled();
  });

  it("skips initial detections when detector type is disabled", () => {
    readyPreferences({
      detect: false,
    });
    mockGame.npcs = [createGameNpc()];
    mockGetNpcTypeByWt.mockReturnValue("HERO");

    processor.handleInitialDetection();

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
  });

  it("auto-sends notifications and chat messages when routing resolves guild ids", async () => {
    readyPreferences({
      autoSend: true,
      routingRules: [
        {
          id: "rule-1",
          minLevel: 200,
          maxLevel: 260,
          guildIds: ["guild-1", "guild-2"],
        },
      ],
    });
    mockGetNpcTypeByWt.mockReturnValue("HERO");
    mockCreateNotification.mockResolvedValue({
      notificationId: "notification-1",
      guildIds: ["guild-1", "guild-2"],
    });
    mockSendChatMessage.mockResolvedValue([]);

    processor.handle(createNpcEvent());

    await Promise.resolve();
    await Promise.resolve();

    expect(mockCreateNotification).toHaveBeenCalledWith({
      npc: {
        id: 500,
        hpp: 0,
        location: "Ithan",
        name: "Detected npc",
        wt: 80,
        x: 12,
        y: 18,
        lvl: 240,
        prof: "m",
        icon: "event-icon.gif",
        type: 3,
      },
      world: "pandora",
      guildIds: ["guild-1", "guild-2"],
    });
    expect(mockSendChatMessage).toHaveBeenCalledWith({
      message: "",
      guildIds: ["guild-1", "guild-2"],
      type: "NPC",
      characterData: {
        nick: "Tester",
        id: 101,
        acc: 202,
        lvl: 230,
        prof: "w",
        icon: "hero.gif",
      },
      npc: {
        x: 12,
        y: 18,
        icon: "event-icon.gif",
        id: 500,
        name: "Detected npc",
        lvl: 240,
        prof: "m",
        type: 3,
        hpp: 0,
        location: "Ithan",
        wt: 80,
      },
    });
    expect(useNpcDetectorStore.getState().npcs[0]).toEqual(
      expect.objectContaining({
        notificationSent: true,
      }),
    );
  });

  it("auto-sends event detections when routing rule world matches current world", async () => {
    readyPreferences({
      autoSend: true,
      routingRules: [
        {
          id: "rule-1",
          minLevel: 200,
          maxLevel: 260,
          world: "pandora",
          guildIds: ["guild-1"],
        },
      ],
    });
    mockGetNpcTypeByWt.mockReturnValue("HERO");
    mockCreateNotification.mockResolvedValue({
      notificationId: "notification-1",
      guildIds: ["guild-1"],
    });
    mockSendChatMessage.mockResolvedValue([]);

    processor.handle(createNpcEvent());

    await Promise.resolve();
    await Promise.resolve();

    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        world: "pandora",
        guildIds: ["guild-1"],
      }),
    );
    expect(mockSendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        guildIds: ["guild-1"],
      }),
    );
    expect(useNpcDetectorStore.getState().npcs[0]).toEqual(
      expect.objectContaining({
        notificationSent: true,
      }),
    );
  });

  it("flushes queued event detections with the same world-specific routing", async () => {
    mockGetNpcTypeByWt.mockReturnValue("HERO");

    processor.handle(createNpcEvent());

    readyPreferences({
      autoSend: true,
      routingRules: [
        {
          id: "rule-1",
          minLevel: 200,
          maxLevel: 260,
          world: "pandora",
          guildIds: ["guild-1"],
        },
      ],
    });
    mockCreateNotification.mockResolvedValue({
      notificationId: "notification-1",
      guildIds: ["guild-1"],
    });
    mockSendChatMessage.mockResolvedValue([]);

    processor.flushPending("202");

    await Promise.resolve();
    await Promise.resolve();

    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        world: "pandora",
        guildIds: ["guild-1"],
      }),
    );
    expect(mockSendChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        guildIds: ["guild-1"],
      }),
    );
    expect(useNpcDetectorStore.getState().npcs[0]).toEqual(
      expect.objectContaining({
        notificationSent: true,
      }),
    );
  });

  it("logs a warning and skips chat when notification creation fails", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    readyPreferences({
      autoSend: true,
      routingRules: [
        {
          id: "rule-1",
          minLevel: 200,
          maxLevel: 260,
          guildIds: ["guild-1"],
        },
      ],
    });
    mockGetNpcTypeByWt.mockReturnValue("HERO");
    mockCreateNotification.mockRejectedValue(new Error("notify failed"));

    processor.handle(createNpcEvent());

    await Promise.resolve();
    await Promise.resolve();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[NpcsDetectionProcessor] Failed to send notification:",
      expect.any(Error),
    );
    expect(mockSendChatMessage).not.toHaveBeenCalled();
  });

  it("logs a warning when chat sending fails after notification creation succeeds", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    readyPreferences({
      autoSend: true,
      routingRules: [
        {
          id: "rule-1",
          minLevel: 200,
          maxLevel: 260,
          guildIds: ["guild-1"],
        },
      ],
    });
    mockGetNpcTypeByWt.mockReturnValue("HERO");
    mockCreateNotification.mockResolvedValue({
      notificationId: "notification-1",
      guildIds: ["guild-1"],
    });
    mockSendChatMessage.mockRejectedValue(new Error("chat failed"));

    processor.handle(createNpcEvent());

    await Promise.resolve();
    await Promise.resolve();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[NpcsDetectionProcessor] Failed to send chat message:",
      expect.any(Error),
    );
  });

  it("does not auto-send when routing rule world does not match current world", async () => {
    readyPreferences({
      autoSend: true,
      routingRules: [
        {
          id: "rule-1",
          minLevel: 200,
          maxLevel: 260,
          world: "fobos",
          guildIds: ["guild-1"],
        },
      ],
    });
    mockGetNpcTypeByWt.mockReturnValue("HERO");

    processor.handle(createNpcEvent());

    await Promise.resolve();
    await Promise.resolve();

    expect(mockCreateNotification).not.toHaveBeenCalled();
    expect(mockSendChatMessage).not.toHaveBeenCalled();
    expect(useNpcDetectorStore.getState().npcs[0]).toEqual(
      expect.objectContaining({
        notificationSent: false,
      }),
    );
  });
});
