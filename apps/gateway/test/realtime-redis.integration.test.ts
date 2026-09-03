import { expect, test } from "bun:test";
import { BunRedis } from "@effect/platform-bun";
import { decodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import { Permission } from "@lootlog/schema/permissions";
import { Fiber, ManagedRuntime } from "effect";
import { Redis } from "effect/unstable/persistence";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import { RedisGatewayStore } from "#src/platform/redis-store";
import { AirTagService } from "#src/realtime/air-tag-service";
import { MapPingService } from "#src/realtime/map-ping-service";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import type { GatewaySocket, SessionData } from "#src/realtime/session";

const redisPort = Number(process.env.LOOTLOG_REALTIME_TEST_REDIS_PORT ?? 0);
const integrationTest = redisPort > 0 ? test : test.skip;

const configuration = {
  redis: {
    host: "127.0.0.1",
    port: redisPort,
    username: "",
    password: "",
    keyPrefix: "lootlog-realtime-integration:test",
  },
  maxBackpressureBytes: 1_048_576,
  maxBackpressureStrikes: 3,
} as GatewayConfiguration;

const guilds = ["organization-1", "organization-2"].map((id) => ({
  guild: { id, ownerId: "owner" },
  roles: [
    {
      id: `role-${id}`,
      lvlRangeFrom: 0,
      lvlRangeTo: 500,
      permissions: [Permission.LOOTLOG_ONLINE_PLAYERS_READ],
    },
  ],
}));

const makeSession = (connectionId: string): SessionData => ({
  discordId: `discord-${connectionId}`,
  userId: `user-${connectionId}`,
  connectionId,
  platform: "game",
  joined: true,
  guilds,
  subscriptions: new Map(),
  airTagScopes: [],
  confidence: "verified",
  presence: {
    userId: `user-${connectionId}`,
    sessionId: `presence-${connectionId}`,
    organizationIds: guilds.map(({ guild }) => guild.id),
    platform: "game",
    status: "online",
    confidence: "verified",
    isAfk: false,
    lastSeen: Date.now(),
    character: {
      world: "classic",
      name: `Hero-${connectionId}`,
      lvl: 300,
      icon: "hero.gif",
      characterId: `character-${connectionId}`,
      accountId: `account-${connectionId}`,
      prof: "w",
    },
    location: { mapId: 7, map: "Ithan", x: 1, y: 2 },
  },
  backpressureStrikes: 0,
});

const makeSocket = (connectionId: string) => {
  const frames: Uint8Array[] = [];
  const socket = {
    data: makeSession(connectionId),
    getBufferedAmount: () => 0,
    send: (bytes: Uint8Array) => {
      frames.push(bytes);
      return bytes.byteLength;
    },
    close: () => undefined,
  } as unknown as GatewaySocket;
  return { socket, frames };
};

const eventsOfType = (frames: ReadonlyArray<Uint8Array>, type: string) =>
  frames
    .map((frame) => decodeRealtimeFrame(frame))
    .filter((frame) => "type" in frame && frame.type === type);

const waitFor = async (predicate: () => boolean): Promise<void> => {
  const deadline = Date.now() + 2_000;
  while (!predicate()) {
    if (Date.now() >= deadline)
      throw new Error("Timed out waiting for Redis federation");
    await Bun.sleep(20);
  }
};

integrationTest(
  "real Redis federates two Gateway instances and preserves map/air contracts",
  async () => {
    const firstRuntime = ManagedRuntime.make(
      BunRedis.layer({ url: `redis://127.0.0.1:${redisPort}` }),
    );
    const secondRuntime = ManagedRuntime.make(
      BunRedis.layer({ url: `redis://127.0.0.1:${redisPort}` }),
    );
    const firstRedis = await firstRuntime.runPromise(Redis.Redis);
    const secondRedis = await secondRuntime.runPromise(Redis.Redis);
    const firstBackgroundFibers: Array<Fiber.RuntimeFiber<void, unknown>> = [];
    const secondBackgroundFibers: Array<Fiber.RuntimeFiber<void, unknown>> = [];
    const firstStore = new RedisGatewayStore(
      firstRedis,
      configuration.redis,
      (effect) => firstRuntime.runPromise(effect),
      (_label, effect) => {
        firstBackgroundFibers.push(firstRuntime.runFork(effect));
      },
    );
    const secondStore = new RedisGatewayStore(
      secondRedis,
      configuration.redis,
      (effect) => secondRuntime.runPromise(effect),
      (_label, effect) => {
        secondBackgroundFibers.push(secondRuntime.runFork(effect));
      },
    );
    await Promise.all([firstStore.connect(), secondStore.connect()]);
    try {
      await firstStore.command.flushdb();
      const firstHub = new RealtimeHub(configuration, firstStore);
      const secondHub = new RealtimeHub(configuration, secondStore);
      await secondRuntime.runPromise(secondHub.start());
      const source = makeSocket("source");
      const recipient = makeSocket("recipient");
      firstHub.register(source.socket);
      secondHub.register(recipient.socket);
      for (const organizationId of ["organization-1", "organization-2"]) {
        secondHub.subscribe(recipient.socket, {
          topic: "map.pings",
          organizationId,
          world: "classic",
          mapId: 7,
        });
      }

      const mapPings = new MapPingService(firstStore, firstHub);
      for (let index = 0; index < 5; index += 1) {
        await expect(
          mapPings.send(source.socket, {
            expectedMapId: 7,
            type: "enemy",
            x: index,
            y: index,
          }),
        ).resolves.toMatchObject({ status: "accepted" });
      }
      await expect(
        mapPings.send(source.socket, {
          expectedMapId: 7,
          type: "enemy",
          x: 6,
          y: 6,
        }),
      ).resolves.toMatchObject({ status: "rejected", code: "rate-limited" });
      await waitFor(
        () => eventsOfType(recipient.frames, "map-ping.received").length >= 5,
      );
      expect(eventsOfType(source.frames, "map-ping.received")).toHaveLength(0);
      expect(eventsOfType(recipient.frames, "map-ping.received")).toHaveLength(
        5,
      );

      await firstStore.command.set(
        "air-tag:disabled:organization-2:classic",
        "1",
      );
      const sourceAirTags = new AirTagService(firstStore, firstHub);
      const recipientAirTags = new AirTagService(secondStore, secondHub);
      await sourceAirTags.updateSubscription(source.socket, {
        requestId: "source-subscription",
        enabled: true,
        expectedMapId: 7,
      });
      await recipientAirTags.updateSubscription(recipient.socket, {
        requestId: "recipient-subscription",
        enabled: true,
        expectedMapId: 7,
      });
      const observation = {
        targetId: "target-1",
        nickname: "Enemy",
        relation: 3 as const,
        x: 10,
        y: 11,
      };
      await expect(
        sourceAirTags.publishObservations(source.socket, {
          expectedMapId: 7,
          observations: [observation, { ...observation, x: 12 }],
        }),
      ).resolves.toEqual({
        status: "accepted",
        acceptedScopes: 1,
        acceptedTargets: 1,
      });
      await waitFor(
        () => eventsOfType(recipient.frames, "air-tag.updated").length === 1,
      );
      expect(eventsOfType(source.frames, "air-tag.updated")).toHaveLength(0);

      const reconnected = makeSocket("reconnected");
      secondHub.register(reconnected.socket);
      const rejoined = await recipientAirTags.updateSubscription(
        reconnected.socket,
        {
          requestId: "reconnected-subscription",
          enabled: true,
          expectedMapId: 7,
        },
      );
      expect(rejoined).toMatchObject({
        status: "accepted",
        scopes: [{ targets: [{ targetId: "target-1", x: 12 }] }],
      });

      for (let index = 0; index < 14; index += 1) {
        const acknowledgement = await sourceAirTags.publishObservations(
          source.socket,
          { expectedMapId: 7, observations: [observation] },
        );
        expect(acknowledgement).toMatchObject({ status: "accepted" });
      }
      await expect(
        sourceAirTags.publishObservations(source.socket, {
          expectedMapId: 7,
          observations: [observation],
        }),
      ).resolves.toMatchObject({ status: "rejected", code: "rate-limited" });

      await Bun.sleep(10_100);
      const afterExpiry = makeSocket("after-expiry");
      const expiredSnapshot = await recipientAirTags.updateSubscription(
        afterExpiry.socket,
        {
          requestId: "expired-subscription",
          enabled: true,
          expectedMapId: 7,
        },
      );
      expect(expiredSnapshot).toMatchObject({
        status: "accepted",
        scopes: [{ targets: [] }],
      });
    } finally {
      await Promise.all([firstStore.close(), secondStore.close()]);
    }
  },
  20_000,
);
