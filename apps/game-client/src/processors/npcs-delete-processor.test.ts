import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { configureApiClients } from "@lootlog/client/transport";
import { getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey } from "@lootlog/client/main";
import type {
  RuntimeIngressSnapshot,
  RuntimeNpc,
} from "@/lib/margonem-runtime/runtime.types";
import { queryClient } from "@/lib/query-client";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import {
  useNotificationsStore,
  type StoredNotification,
} from "@/store/notifications.store";
import { normalizeNpc } from "@/lib/margonem-runtime/runtime-adapter";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useGameStore } from "@/store/game.store";
import { NpcsDeleteProcessor } from "./npcs-delete-processor";

const trackedNpc = (id = 500) => ({
  id,
  tpl: id,
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

const notification = (id = 500): StoredNotification => ({
  notificationId: `notification-${id}`,
  listKey: `notification-${id}`,
  receivedAtMs: Date.now(),
  servers: ["guild-1"],
  world: "pandora",
  guildId: "guild-1",
  discordId: "user-1",
  createdAt: new Date().toISOString(),
  message: "NPC",
  npc: { ...trackedNpc(id), name: "Stwór" },
});

const configKey =
  getUserLootlogConfigControllerGetUserLootlogConfigByAccountIdQueryKey({
    accountId: "202",
  });

const createFixture = () => {
  setTestRuntimeGame({
    world: "pandora",
    hero: { accountId: "202", characterId: "101" },
    map: { id: 3327, name: "Urwisko", visibility: 30 },
  });
  const npcsById: Record<number, RuntimeNpc> = {};
  npcsById[500] = normalizeNpc({ ...trackedNpc(), resp_rand: 15 });

  const ingress = {
    game: useGameStore.getState().game,
    intent: null,
    npcsById,
    othersById: {},
  } satisfies RuntimeIngressSnapshot;

  const requests: Request[] = [];
  let status = 200;

  const fetch: typeof globalThis.fetch = (input, init) => {
    requests.push(new Request(input, init));

    return Promise.resolve(
      Response.json({ submittedGuilds: [], rejectedGuilds: [] }, { status }),
    );
  };

  onTestFinished(
    configureApiClients({
      main: { baseUrl: "https://api.example.test", fetch },
    }),
  );
  queryClient.setQueryData(configKey, {
    "101": { catchingGuildIds: ["guild-1"] },
  });
  const processor = new NpcsDeleteProcessor();

  return {
    ingress,
    requests,
    handle: (event: Parameters<NpcsDeleteProcessor["handle"]>[0]) =>
      processor.handle(event, ingress),
    fail: () => {
      status = 400;
    },
    succeed: () => {
      status = 200;
    },
  };
};

beforeEach(() => {
  queryClient.clear();
  useNpcDetectorStore.setState({
    npcs: [trackedNpc()],
    activeDetectionAnimations: { 500: 1 },
    latestDetectionAnimationCycle: 1,
  });
  useNotificationsStore.setState({
    notifications: [notification()],
    notificationAutoHideByListKey: {},
  });
});

afterEach(() => {
  queryClient.clear();
  vi.restoreAllMocks();
});

it("ignores packets without deleted NPCs", () => {
  const fixture = createFixture();
  fixture.handle({});
  expect(fixture.requests).toHaveLength(0);
  expect(useNpcDetectorStore.getState().npcs).toHaveLength(1);
});

it("removes local detection and notifications before validating missing runtime data", () => {
  const fixture = createFixture();
  fixture.ingress.npcsById = {};
  fixture.handle({ npcs_del: [{ id: 500, respBaseSeconds: 30 }] });
  expect(useNpcDetectorStore.getState().npcs).toEqual([]);
  expect(useNotificationsStore.getState().notifications).toEqual([]);
  expect(fixture.requests).toHaveLength(0);
});

it("publishes each local store once for a deletion batch", () => {
  const fixture = createFixture();
  fixture.ingress.npcsById = {};
  useNpcDetectorStore.setState({ npcs: [trackedNpc(), trackedNpc(501)] });
  useNotificationsStore.setState({
    notifications: [notification(), notification(501)],
  });
  let detectorPublications = 0;
  let notificationPublications = 0;
  onTestFinished(
    useNpcDetectorStore.subscribe(() => {
      detectorPublications += 1;
    }),
  );
  onTestFinished(
    useNotificationsStore.subscribe(() => {
      notificationPublications += 1;
    }),
  );
  fixture.handle({
    npcs_del: [
      { id: 500, respBaseSeconds: 30 },
      { id: 501, respBaseSeconds: 30 },
    ],
  });
  expect(detectorPublications).toBe(1);
  expect(notificationPublications).toBe(1);
  expect(useNpcDetectorStore.getState().npcs).toEqual([]);
  expect(useNotificationsStore.getState().notifications).toEqual([]);
});

it.each([undefined, 1])(
  "does not submit missing or too short respawn duration %s",
  (respBaseSeconds) => {
    const fixture = createFixture();
    fixture.handle({ npcs_del: [{ id: 500, respBaseSeconds }] });
    expect(fixture.requests).toHaveLength(0);
  },
);

it("does not submit low-weight NPCs", () => {
  const fixture = createFixture();
  fixture.ingress.npcsById[500] = {
    ...fixture.ingress.npcsById[500],
    weight: 10,
  };
  fixture.handle({ npcs_del: [{ id: 500, respBaseSeconds: 30 }] });
  expect(fixture.requests).toHaveLength(0);
});

it("does not submit without whitelisted guilds", () => {
  const fixture = createFixture();
  queryClient.setQueryData(configKey, { "101": { catchingGuildIds: [] } });
  fixture.handle({ npcs_del: [{ id: 500, respBaseSeconds: 30 }] });
  expect(fixture.requests).toHaveLength(0);
});

it("submits distinct respawn effects sharing one event id", async () => {
  const fixture = createFixture();
  fixture.handle({ ev: 77, npcs_del: [{ id: 500, respBaseSeconds: 30 }] });
  fixture.handle({ ev: 77, npcs_del: [{ id: 500, respBaseSeconds: 31 }] });
  await waitFor(() => expect(fixture.requests).toHaveLength(2));
  expect(await fixture.requests[0].json()).toMatchObject({
    respBaseSeconds: 30,
  });
  expect(await fixture.requests[1].json()).toMatchObject({
    respBaseSeconds: 31,
  });
});

it("sends native respawn details and actor identity to the timer endpoint", async () => {
  const fixture = createFixture();
  fixture.handle({ npcs_del: [{ id: 500, respBaseSeconds: 30 }] });
  await waitFor(() => expect(fixture.requests).toHaveLength(1));
  expect(new URL(fixture.requests[0].url).pathname).toBe("/timers/auto");
  expect(await fixture.requests[0].json()).toMatchObject({
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
  });
});

it.each([
  { mapId: 3327, name: "Terrozaur (urwisko)" },
  { mapId: 9999, name: "Bazowa nazwa" },
])(
  "uses mapped elite name when available on map $mapId",
  async ({ mapId, name }) => {
    const fixture = createFixture();

    const npc: RuntimeNpc = {
      ...fixture.ingress.npcsById[500],
      weight: 20,
      name: "Bazowa nazwa",
    };

    fixture.ingress.npcsById[500] = npc;

    if (fixture.ingress.game)
      fixture.ingress.game = {
        ...fixture.ingress.game,
        map: { ...fixture.ingress.game.map, id: mapId },
      };
    fixture.handle({ npcs_del: [{ id: 500, respBaseSeconds: 30 }] });
    await waitFor(() => expect(fixture.requests).toHaveLength(1));
    expect(await fixture.requests[0].json()).toMatchObject({ npc: { name } });
  },
);

it("reports an HTTP rejection and permits a subsequent attempt", async () => {
  const fixture = createFixture();
  fixture.fail();
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const event = { npcs_del: [{ id: 500, respBaseSeconds: 30 }] };
  fixture.handle(event);
  await waitFor(() =>
    expect(warn).toHaveBeenCalledWith(
      "[NpcsDeleteProcessor] Failed to create timer:",
      expect.any(Error),
    ),
  );
  fixture.succeed();
  fixture.handle(event);
  await waitFor(() => expect(fixture.requests).toHaveLength(2));
});
