import type { GameEvent } from "@lootlog/margonem/game-events";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { configureApiClients } from "@lootlog/client/transport";
import {
  defaultNotificationsSettings,
  defaultMapPingPreferences,
  defaultAirTagPreferences,
  type UserGameAccountPreferences,
} from "@lootlog/schema/account-preferences";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useDialogStore } from "@/store/game-store/dialog.store";
import { useLootStore } from "@/store/game-store/loot.store";
import { useGlobalStore } from "@/store/global.store";
import { useNpcsStore } from "@/store/npcs.store";
import { npcsDetectionProcessor } from "@/processors/npcs-detection-processor";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { normalizeNpc } from "@/lib/margonem-runtime/runtime-adapter";
import {
  createDetectorSettings,
  getUserGameAccountPreferencesQueryKey,
} from "./game-account-preferences";
import { queryClient } from "./query-client";
import { EventDispatcher } from "./event-dispatcher";

const town = (id: number): NonNullable<GameEvent["town"]> => ({
  id,
  name: `Map ${id}`,
  mainid: 0,
  bg: "",
  file: "",
  mode: 0,
  pvp: 0,
  visibility: 30,
  water: "",
  x: 32,
  y: 32,
});

const npcEvent: GameEvent = {
  npcs: [{ id: 500, tpl: 900, x: 12, y: 18, icon: { id: 44 } }],
  npc_tpls: [
    {
      id: 900,
      level: 120,
      nick: "Tanroth",
      prof: "w",
      type: 2,
      warrior_type: 85,
      resp_rand: 10,
    },
  ],
  icons: [{ id: 44, icon: "npc.gif" }],
};

beforeEach(() => {
  queryClient.clear();
  npcsDetectionProcessor.cleanup();
  useNpcDetectorStore.setState(useNpcDetectorStore.getInitialState(), true);
  useNpcsStore.getState().clearNpcs();
  useDialogStore.getState().clearNpcContext();
  useLootStore.getState().setLastLootId(null);
  useGlobalStore.setState({
    socketState: { connected: false, joined: false, joinedGuilds: [] },
  });
  setTestRuntimeGame();
  const detector = createDetectorSettings();
  detector.HERO.detect = true;
  detector.HERO.notifySound = false;
  detector.HERO.autoSend = false;

  const preferences: UserGameAccountPreferences = {
    accountId: "202",
    detector,
    notifications: defaultNotificationsSettings,
    pings: defaultMapPingPreferences,
    airTags: defaultAirTagPreferences,
    hasStoredDetector: true,
    hasStoredNotifications: false,
    hasStoredPings: false,
    hasStoredAirTags: false,
    hasStoredPreferences: true,
  };

  queryClient.setQueryData(
    getUserGameAccountPreferencesQueryKey("202"),
    preferences,
  );
});

afterEach(() => {
  queryClient.clear();
  npcsDetectionProcessor.cleanup();
  vi.restoreAllMocks();
});

it("ignores unrelated packets without changing existing feature state", () => {
  useDialogStore
    .getState()
    .setNpcContext({ npcId: 7, npc: null, source: "dialog-event" });
  const before = useDialogStore.getState();
  new EventDispatcher().handleEvent({
    e: "ok",
    friends: [],
    friends_max: 50,
    party: { members: {} },
  });
  expect(useDialogStore.getState()).toBe(before);
  expect(useNpcDetectorStore.getState().npcs).toEqual([]);
});

it("routes dialog context and NPC detections through their real processors", () => {
  const dispatcher = new EventDispatcher();
  dispatcher.handleEvent({ d: ["dialog", "npc", "7"] });
  expect(useDialogStore.getState().npcContext).toEqual({
    npcId: 7,
    npc: null,
    source: "dialog-event",
  });
  dispatcher.handleEvent(npcEvent);
  expect(useNpcDetectorStore.getState().npcs).toMatchObject([
    {
      id: 500,
      nick: "Tanroth",
      lvl: 120,
      location: "Ithan",
      notificationSent: false,
    },
  ]);
  expect(useDialogStore.getState().npcContext?.npcId).toBe(7);
});

it("clears the previous map before processing NPCs from the same packet", () => {
  const dispatcher = new EventDispatcher();
  dispatcher.handleEvent({ town: town(1) });
  dispatcher.handleEvent(npcEvent);
  useDialogStore
    .getState()
    .setNpcContext({ npcId: 7, npc: null, source: "dialog-event" });
  dispatcher.handleEvent({ ...npcEvent, town: town(2) });
  expect(useNpcDetectorStore.getState().npcs).toMatchObject([
    { id: 500, nick: "Tanroth" },
  ]);
  expect(useNpcDetectorStore.getState().npcs).toHaveLength(1);
  expect(useDialogStore.getState().npcContext).toBeNull();
  dispatcher.handleEvent({ town: town(2) });
  expect(useNpcDetectorStore.getState().npcs).toHaveLength(1);
  dispatcher.handleEvent({ town: town(3) });
  expect(useNpcDetectorStore.getState().npcs).toEqual([]);
});

it("continues to later packet facts when an observer throws during map cleanup", () => {
  const dispatcher = new EventDispatcher();
  dispatcher.handleEvent({ town: town(1) });
  dispatcher.handleEvent(npcEvent);
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});

  const unsubscribe = useNpcDetectorStore.subscribe(() => {
    unsubscribe();
    throw new Error("observer failed");
  });

  expect(() =>
    dispatcher.handleEvent({ ...npcEvent, town: town(2) }),
  ).not.toThrow();
  expect(warning).toHaveBeenCalledWith(
    "[EventDispatcher] Failed to process map-change handler:",
    expect.objectContaining({ message: "observer failed" }),
  );
  expect(useNpcDetectorStore.getState().npcs).toMatchObject([
    { id: 500, nick: "Tanroth" },
  ]);
});

it("bootstraps detector features from normalized NPCs without replacing domain snapshots", () => {
  const npc = normalizeNpc({
    id: 500,
    tpl: 900,
    nick: "Tanroth",
    icon: "npc.gif",
    x: 12,
    y: 18,
    lvl: 120,
    prof: "w",
    wt: 85,
    type: 2,
  });

  if (!npc) throw new Error("Expected a valid runtime NPC");
  useNpcsStore.getState().replaceNpcs([npc]);
  const before = useNpcsStore.getState();
  new EventDispatcher().handleInitialEvents();
  expect(useNpcDetectorStore.getState().npcs).toMatchObject([
    { id: 500, nick: "Tanroth" },
  ]);
  expect(useNpcsStore.getState()).toBe(before);
});

it("sends loot distribution updates over HTTP and clears the pending loot only after success", async () => {
  const requests: Request[] = [];

  const restore = configureApiClients({
    main: {
      baseUrl: "https://api.example.test",
      fetch: (input, init) => {
        requests.push(new Request(input, init));

        return Promise.resolve(Response.json({}));
      },
    },
  });

  onTestFinished(restore);
  useLootStore.getState().setLastLootId(123);
  new EventDispatcher().handleEvent({
    chat: {
      channels: {
        system: {
          archivedIds: [],
          msg: [{ id: 1, ts: 1, msg: "Podział łupów: Tanroth" }],
        },
      },
    },
  });
  await waitFor(() => expect(requests).toHaveLength(1));
  expect(await requests[0]?.json()).toMatchObject({
    msg: "Podział łupów: Tanroth",
  });
  await waitFor(() => expect(useLootStore.getState().lastLootId).toBeNull());
});
