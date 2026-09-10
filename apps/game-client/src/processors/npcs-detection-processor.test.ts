import { waitFor } from "@testing-library/react";
import { configureApiClients } from "@lootlog/client/transport";
import { getSoundSettingsControllerGetSettingsQueryKey } from "@lootlog/client/main";
import type { UserSoundSettings } from "@lootlog/schema/sound-settings";
import { useSettingsStore } from "@/store/settings.store";
import { disposeSoundPlayback } from "@/lib/sound-playback";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createDetectorSettings,
  getUserGameAccountPreferencesQueryKey,
} from "@/lib/game-account-preferences";
import { queryClient } from "@/lib/query-client";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useWindowsStore } from "@/store/windows.store";
import { NpcsDetectionProcessor } from "./npcs-detection-processor";
import type { GameNpc } from "@lootlog/margonem/npcs";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { normalizeNpc } from "@/lib/margonem-runtime/runtime-adapter";
import { useNpcsStore } from "@/store/npcs.store";
import { useGameStore } from "@/store/game.store";

const requests: Request[] = [];

let notificationStatus = 200;

let chatStatus = 200;

let responseGuildIds: string[] = [];

let restoreApi: () => void = () => {};

const play = vi.fn<HTMLMediaElement["play"]>().mockResolvedValue();

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
  responseGuildIds =
    overrides?.routingRules?.flatMap((rule) => rule.guildIds) ?? [];
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
  npcTpls?: NonNullable<GameEvent["npc_tpls"]>;
  icons?: NonNullable<GameEvent["icons"]>;
}): GameEvent => ({
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
});

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

const setInitialNpcs = (npcs: GameNpc[]) => {
  useNpcsStore.getState().replaceNpcs(npcs.map(normalizeNpc));
  useGameStore.getState().replaceGame({
    hero: {
      accountId: "202",
      characterId: "101",
      currentHp: 1,
      icon: "hero.gif",
      level: 230,
      maxHp: 1,
      name: "Tester",
      profession: "w",
      x: 1,
      y: 2,
    },
    interface: "ni",
    map: { id: 1, name: "Ithan", visibility: 30 },
    world: "pandora",
  });
};

const createNpcTpl = (): NonNullable<GameEvent["npc_tpls"]>[number] => ({
  id: 900,
  nick: "Detected npc",
  warrior_type: 80,
  prof: "m",
  type: 3,
  level: 240,
  elasticLevelFactor: 1,
  resp_rand: 10,
});

afterEach(() => {
  restoreApi();
  disposeSoundPlayback();
  queryClient.clear();
  vi.restoreAllMocks();
});

describe("NpcsDetectionProcessor", () => {
  let processor: NpcsDetectionProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    requests.length = 0;
    notificationStatus = 200;
    chatStatus = 200;
    restoreApi = configureApiClients({
      main: {
        baseUrl: "https://api.example.test",
        fetch: (input, init) => {
          const request = new Request(input, init);
          requests.push(request);
          const notification = new URL(request.url).pathname === "/messaging";
          const status = notification ? notificationStatus : chatStatus;

          return Promise.resolve(
            Response.json(
              notification
                ? {
                    notificationId: "notification-1",
                    guildIds: responseGuildIds,
                  }
                : { id: "message-1" },
              { status },
            ),
          );
        },
      },
    });
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    useSettingsStore.setState({ soundsMuted: false, masterVolume: 1 });
    queryClient.clear();

    const sound: UserSoundSettings = {
      userId: "user-1",
      masterVolume: 1,
      detectorVolume: 1,
      notificationsVolume: 1,
      timersVolume: 1,
      pingsVolume: 1,
      detectorConfig: {
        HERO: { volume: 1, soundUrl: "https://example.test/hero.mp3" },
      },
      notificationsConfig: {},
      timersConfig: {},
    };

    queryClient.setQueryData(
      getSoundSettingsControllerGetSettingsQueryKey(),
      sound,
    );
    processor = new NpcsDetectionProcessor();
    processor.cleanup();
    useNpcsStore.getState().clearNpcs();
    useGameStore.getState().clearGame();
    setInitialNpcs([]);
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
    useGameStore.getState().clearGame();

    processor.handle(createNpcEvent());
    processor.handleInitialDetection();

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
  });

  it("queues event until detector preferences are ready and flushes it later", () => {
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

  it("replaces an overflowing account queue with one authoritative rescan", () => {
    for (let index = 0; index < 201; index += 1) {
      processor.handle({
        ...createNpcEvent(),
        npcs: [
          {
            id: index,
            x: 12,
            y: 18,
            tpl: 900,
            icon: { id: 44 },
          },
        ],
      });
    }

    setInitialNpcs([createGameNpc({ id: 999 })]);
    readyPreferences();
    processor.flushPending("202");

    expect(useNpcDetectorStore.getState().npcs).toEqual([
      expect.objectContaining({ id: 999 }),
    ]);
  });

  it("does not flush pending detections when preferences are still not ready", () => {
    processor.handle(createNpcEvent());
    processor.flushPending("202");

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
  });

  it("clears pending detections during teardown without scheduling polling", () => {
    vi.useFakeTimers();

    try {
      processor.handle(createNpcEvent());
      readyPreferences();
      processor.handleInitialDetection();

      processor.cleanup();
      processor.flushPending("202");

      expect(useNpcDetectorStore.getState().npcs).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns early when there is nothing pending to flush", () => {
    readyPreferences();

    processor.flushPending("202");

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
  });

  it("queues only one initial detection before preferences are ready", () => {
    setInitialNpcs([createGameNpc()]);

    processor.handleInitialDetection();
    processor.handleInitialDetection();

    readyPreferences({
      notifySound: true,
    });
    processor.flushPending("202");

    expect(useNpcDetectorStore.getState().npcs).toHaveLength(1);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("keeps a queued initial detection until the NPC domain is ready", () => {
    useNpcsStore.getState().clearNpcs();

    processor.handleInitialDetection();
    readyPreferences({ notifySound: true });
    processor.flushPending("202");
    processor.handleInitialDetection();

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);

    useNpcsStore
      .getState()
      .replaceNpcs([normalizeNpc(createGameNpc({ id: 777 }))]);
    processor.flushPending("202");

    expect(useNpcDetectorStore.getState().npcs).toEqual([
      expect.objectContaining({ id: 777 }),
    ]);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("processes initial detection immediately when preferences are ready", () => {
    readyPreferences({
      notifySound: true,
    });
    setInitialNpcs([createGameNpc()]);

    processor.handleInitialDetection();

    expect(useNpcDetectorStore.getState().npcs).toEqual([
      expect.objectContaining({
        id: 501,
        nick: "Initial npc",
        icon: "fallback-icon.gif",
      }),
    ]);
    expect(play).toHaveBeenCalledOnce();
  });

  it("rebuilds the projection when bootstrap is called after NPC state becomes ready", () => {
    vi.useFakeTimers();

    try {
      readyPreferences({
        notifySound: true,
      });
      vi.clearAllTimers();

      processor.handleInitialDetection();
      processor.handleInitialDetection();

      expect(useNpcDetectorStore.getState().npcs).toEqual([]);

      setInitialNpcs([createGameNpc()]);
      processor.handleInitialDetection();

      expect(useNpcDetectorStore.getState().npcs).toEqual([
        expect.objectContaining({
          id: 501,
          nick: "Initial npc",
          icon: "fallback-icon.gif",
        }),
      ]);
      expect(play).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not poll while NPC state is uninitialized", () => {
    vi.useFakeTimers();

    try {
      readyPreferences({
        notifySound: true,
      });
      useNpcsStore.getState().clearNpcs();
      vi.clearAllTimers();

      processor.handleInitialDetection();

      expect(useNpcDetectorStore.getState().npcs).toEqual([]);

      expect(vi.getTimerCount()).toBe(0);
      expect(play).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not schedule retry timers for an uninitialized NPC domain", () => {
    vi.useFakeTimers();

    try {
      readyPreferences();
      vi.clearAllTimers();

      processor.handleInitialDetection();

      expect(useNpcDetectorStore.getState().npcs).toEqual([]);
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
    });

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
  });

  it("ignores detections when template is missing or detector type is disabled", () => {
    readyPreferences({
      detect: false,
    });

    processor.handle(createNpcEvent({ npcTpls: [] }));
    processor.handle(createNpcEvent());

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
    expect(play).not.toHaveBeenCalled();
  });

  it("uses the normalized NPC store as template and icon fallback", () => {
    readyPreferences({
      notifySound: true,
    });
    setInitialNpcs([
      createGameNpc({
        id: 500,
        nick: "Fallback npc",
        icon: "fallback-icon.gif",
        tpl: 900,
      }),
    ]);

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
    expect(play).toHaveBeenCalledOnce();
    expect(requests).toHaveLength(0);
  });

  it("skips initial detections when detector type is disabled", () => {
    readyPreferences({
      detect: false,
    });
    setInitialNpcs([createGameNpc()]);

    processor.handleInitialDetection();

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
  });

  it.each(["any-world", "matching-world", "queued"] as const)(
    "sends notification then chat to routed guilds for %s detections",
    async (mode) => {
      if (mode === "queued") processor.handle(createNpcEvent());
      readyPreferences({
        autoSend: true,
        routingRules: [
          {
            id: "rule-1",
            minLevel: 200,
            maxLevel: 260,
            world: mode === "any-world" ? undefined : "pandora",
            guildIds: ["guild-1", "guild-2"],
          },
        ],
      });

      if (mode === "queued") processor.flushPending("202");
      else processor.handle(createNpcEvent());
      await waitFor(() => expect(requests).toHaveLength(3));
      const first = requests[0];

      if (!first) throw new Error("Expected notification request");
      expect(await first.json()).toMatchObject({
        world: "pandora",
        guildIds: ["guild-1", "guild-2"],
        npc: {
          id: 500,
          name: "Detected npc",
          lvl: 240,
          prof: "m",
          wt: 80,
          location: "Ithan",
        },
      });
      expect(
        requests
          .slice(1)
          .map((request) => new URL(request.url).pathname)
          .sort(),
      ).toEqual([
        "/guilds/guild-1/chat-messages",
        "/guilds/guild-2/chat-messages",
      ]);
      expect(await requests[1]?.json()).toMatchObject({
        type: "NPC",
        characterData: { nick: "Tester", id: 101, acc: 202 },
        npc: { id: 500, name: "Detected npc" },
      });
      expect(useNpcDetectorStore.getState().npcs[0]?.notificationSent).toBe(
        true,
      );
    },
  );
  it("does not send chat when notification HTTP creation fails", async () => {
    notificationStatus = 503;
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    readyPreferences({
      autoSend: true,
      routingRules: [
        { id: "rule-1", minLevel: 200, maxLevel: 260, guildIds: ["guild-1"] },
      ],
    });
    processor.handle(createNpcEvent());
    await waitFor(() =>
      expect(warning).toHaveBeenCalledWith(
        "[NpcsDetectionProcessor] Failed to send notification:",
        expect.any(Error),
      ),
    );
    expect(requests).toHaveLength(1);
    expect(useNpcDetectorStore.getState().npcs[0]?.notificationSent).toBe(
      false,
    );
  });
  it("retains the accepted notification when subsequent chat HTTP delivery fails", async () => {
    chatStatus = 503;
    readyPreferences({
      autoSend: true,
      routingRules: [
        { id: "rule-1", minLevel: 200, maxLevel: 260, guildIds: ["guild-1"] },
      ],
    });
    processor.handle(createNpcEvent());
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(useNpcDetectorStore.getState().npcs[0]?.notificationSent).toBe(true);
  });
  it("does not auto-send when the routing rule targets another world", () => {
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
    processor.handle(createNpcEvent());
    expect(requests).toHaveLength(0);
    expect(useNpcDetectorStore.getState().npcs[0]?.notificationSent).toBe(
      false,
    );
  });
});
