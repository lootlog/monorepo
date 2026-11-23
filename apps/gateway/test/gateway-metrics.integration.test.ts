import { expect, test } from "bun:test";
import { Effect, Metric } from "effect";
import { PRESENCE_EXPIRY_MS } from "@lootlog/protocol/realtime";
import { GatewayMetrics } from "#src/realtime/gateway-metrics";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import { useDragonfly } from "./dragonfly-fixtures.js";
import {
  hubConfig,
  makeAdminSession,
  makeGamePresence,
  makeTestSocket,
  unusedFederationStore,
} from "./realtime-fixtures.js";
import {
  eventsOfType,
  makeConfiguration,
  makeSocket,
} from "./realtime-redis-fixtures.js";

const openStore = useDragonfly();

const SNAPSHOTS = "realtime:metrics:instances:v2";

test("global chat counts a User once across replicas and still adds replicas of the previous release", async () => {
  await using redis = await openStore(`metrics:${crypto.randomUUID()}`);

  const replica = (connectionId: string) => {
    const hub = new RealtimeHub(hubConfig, unusedFederationStore);

    const session = makeAdminSession(connectionId, {
      discordId: "discord-shared",
      userId: "user-shared",
      platform: "game",
    });

    session.presence = makeGamePresence(session, "tempest");
    const { socket } = makeTestSocket(session);
    hub.register(socket);
    hub.subscribe(socket, { topic: "global.chat" });
    hub.subscribe(socket, { topic: "global.chat.world", world: "tempest" });

    return {
      hub,
      metrics: new GatewayMetrics(redis.store.command, hub, () => 1),
    };
  };

  await redis.store.command.eval(
    `
      local time = redis.call('TIME')
      redis.call('HSET', KEYS[1], 'previous-release', cjson.encode({
        at = tonumber(time[1]) * 1000,
        connections = 3,
        sessions = 3,
        players = {'discord-previous-1', 'discord-previous-2', 'discord-previous-3'},
        globalChatListeners = {[''] = 2, tempest = 1},
        worldPlayers = {tempest = 3},
      }))
      return 1
    `,
    1,
    SNAPSHOTS,
  );

  const first = replica("first");
  const second = replica("second");
  await Effect.runPromise(first.metrics.sample());
  await Effect.runPromise(second.metrics.sample());

  expect(second.hub.globalChatCounts).toEqual({
    online: 4,
    playersByWorld: { tempest: 4 },
    listeners: { "": 3, tempest: 2 },
  });
});

test("gateway metrics deduplicate Discord accounts across characters and replicas and expire abandoned replicas", async () => {
  await using redis = await openStore(`metrics:${crypto.randomUUID()}`);
  const { store } = redis;
  const first = makeSocket("metrics-first").socket;
  const duplicate = makeSocket("metrics-duplicate").socket;
  Object.assign(duplicate, {
    data: {
      ...duplicate.data,
      discordId: first.data.discordId,
      userId: first.data.userId,
    },
  });
  const second = makeSocket("metrics-second").socket;
  const web = makeSocket("metrics-web").socket;
  const webSession = { ...web.data, platform: "web-app" as const };
  Object.assign(web, { data: webSession });
  let now = Date.now();
  const firstHub = new RealtimeHub(makeConfiguration(), store);
  const secondHub = new RealtimeHub(makeConfiguration(), store);
  firstHub.register(first);
  firstHub.register(web);
  secondHub.register(duplicate);
  secondHub.register(second);
  const replicaA = new GatewayMetrics(store.command, firstHub, () => now);
  const replicaB = new GatewayMetrics(store.command, secondHub, () => now);
  await Effect.runPromise(replicaA.sample());
  expect(await Effect.runPromise(replicaB.sample())).toEqual({
    connections: 4,
    gameSessions: 3,
    uniquePlayers: 2,
  });
  firstHub.detach(first);
  expect(await Effect.runPromise(replicaA.sample())).toEqual({
    connections: 3,
    gameSessions: 2,
    uniquePlayers: 2,
  });
  await store.command.eval(
    `
      local value = cjson.decode(redis.call('HGET', KEYS[1], ARGV[1]))
      value.at = value.at - 30000
      redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(value))
      return 1
    `,
    1,
    SNAPSHOTS,
    secondHub.instanceId,
  );
  expect(await Effect.runPromise(replicaA.sample())).toEqual({
    connections: 1,
    gameSessions: 0,
    uniquePlayers: 0,
  });
  expect(await Effect.runPromise(replicaB.sample())).toEqual({
    connections: 3,
    gameSessions: 2,
    uniquePlayers: 2,
  });
  now += PRESENCE_EXPIRY_MS;
  expect(await Effect.runPromise(replicaB.sample())).toEqual({
    connections: 3,
    gameSessions: 0,
    uniquePlayers: 0,
  });

  const observed = Metric.gauge("lootlog_gateway_cluster_observed_at_seconds", {
    attributes: { unit: "s" },
  });

  const lastSuccess = Effect.runSync(Metric.value(observed)).value;
  await store.command.del(SNAPSHOTS);
  await store.command.set(SNAPSHOTS, "invalid Redis type");
  now += 10_000;
  const result = await Effect.runPromiseExit(replicaB.sample());
  expect(result._tag).toBe("Failure");
  expect(Effect.runSync(Metric.value(observed)).value).toBe(lastSuccess);
  expect(
    Effect.runSync(
      Metric.value(
        Metric.gauge("lootlog_gateway_cluster_connections", {
          attributes: { unit: "" },
        }),
      ),
    ).value,
  ).toBe(3);
});

test("gateway metrics tell each global chat channel its cluster-wide players and listeners", async () => {
  await using redis = await openStore(`metrics:${crypto.randomUUID()}`);

  const listener = (id: string, world: string) => {
    const target = makeSocket(id);
    const { data } = target.socket;

    Object.assign(target.socket, {
      data: {
        ...data,
        presence: data.presence?.character && {
          ...data.presence,
          character: { ...data.presence.character, world },
        },
      },
    });

    return target;
  };

  const firstHub = new RealtimeHub(makeConfiguration(), redis.store);
  const secondHub = new RealtimeHub(makeConfiguration(), redis.store);
  const gordionA = listener("chat-gordion-a", "gordion");
  const sharedA = listener("chat-shared-a", "gordion");
  const gordionB = listener("chat-gordion-b", "classic");
  const sharedB = listener("chat-shared-b", "classic");
  const gordion = { topic: "global.chat.world", world: "gordion" } as const;

  for (const [hub, target, scope] of [
    [firstHub, gordionA, gordion],
    [firstHub, sharedA, { topic: "global.chat" }],
    [secondHub, gordionB, gordion],
    [secondHub, sharedB, { topic: "global.chat" }],
  ] as const) {
    hub.register(target.socket);
    hub.subscribe(target.socket, scope);
  }

  await Effect.runPromise(
    new GatewayMetrics(redis.store.command, secondHub).sample(),
  );
  await Effect.runPromise(
    new GatewayMetrics(redis.store.command, firstHub).sample(),
  );

  const stats = (frames: string[]) => eventsOfType(frames, "global-chat.stats");

  expect(stats(gordionA.frames)).toEqual([
    {
      v: 1,
      type: "global-chat.stats",
      data: { world: "gordion", online: 2, listeners: 2 },
    },
  ]);
  expect(stats(sharedA.frames)).toEqual([
    { v: 1, type: "global-chat.stats", data: { online: 4, listeners: 2 } },
  ]);
  expect(stats(gordionB.frames)).toEqual([
    {
      v: 1,
      type: "global-chat.stats",
      data: { world: "gordion", online: 0, listeners: 1 },
    },
  ]);
  expect(stats(sharedB.frames)).toEqual([
    { v: 1, type: "global-chat.stats", data: { online: 2, listeners: 1 } },
  ]);
});
