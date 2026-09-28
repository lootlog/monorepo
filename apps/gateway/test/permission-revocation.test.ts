import { expect, test } from "bun:test";
import { encode } from "@msgpack/msgpack";
import { Effect, Redacted, Schema } from "effect";
import { HttpClient, HttpClientResponse } from "effect/unstable/http";
import type {
  RabbitDelivery,
  RabbitMessagingService,
} from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { decodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import { Permission } from "@lootlog/schema/permissions";
import {
  InternalGuildsData,
  makeInternalGuildsData,
  getInternalUserPermissions,
  type InternalGuildsPersistence,
} from "../../api/src/http-api/handlers/internal/internal.handlers.js";
import { InternalUserPermissionsQuery } from "../../api/src/contracts/internal/schemas.js";
import { createPermissionCacheBoundary } from "../../api/test/permission-cache-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../api/test/organization-fixtures.js";
import type { GatewayConfiguration } from "../src/config/gateway-config.js";
import { makeGuildStore } from "../src/guilds/guild-store.js";
import type { FederatedRealtimeMessage } from "../src/platform/redis-store.js";
import {
  RabbitBridge,
  gatewayConsumerSpecs,
} from "../src/rabbit/rabbit-bridge.js";
import { ActivityPublisher } from "../src/rabbit/activity-publisher.js";
import { CoveragePublisher } from "../src/rabbit/coverage-publisher.js";
import { makeMargonemProofVerifier } from "../src/auth/margonem-proof.js";
import { CommandHandler } from "../src/realtime/command-handler.js";
import { PresenceStore } from "../src/realtime/presence-store.js";
import { MapPingService } from "../src/realtime/map-ping-service.js";
import { BattlePingService } from "../src/realtime/battle-ping-service.js";
import { AirTagService } from "../src/realtime/air-tag-service.js";
import { RealtimeHub } from "../src/realtime/realtime-hub.js";
import type { GatewaySocket, SessionData } from "../src/realtime/session.js";
import { makeGuildStoreRedis } from "./guild-store-fixtures.js";
import { createRabbitDelivery } from "./rabbit-fixtures.js";

const identity = { discordId: "discord-member", userId: "user-member" };

const config: GatewayConfiguration = {
  environment: "test",
  port: 0,
  serviceName: "gateway",
  serviceNamespace: "test",
  apiUrl: "http://api.test",
  margonemSigningKeyUrl: "http://unused.test/key",
  rabbitmqUri: Redacted.make("unused"),
  activityEventSignatureSecret: Redacted.make("test"),
  redis: {
    host: "unused",
    port: 0,
    username: "",
    password: Redacted.make(""),
    keyPrefix: "test",
  },
  websocketPath: "/ws",
  allowedWebOrigins: new Set(),
  allowedExtensionOrigins: new Set(),
  maxBackpressureBytes: 1_048_576,
};

const grantedPermissions = [
  Permission.LOOTLOG_ACCESS,
  Permission.LOOTLOG_CHAT_READ,
  Permission.LOOTLOG_TIMERS_READ,
  Permission.LOOTLOG_TIMERS_HEROES_READ,
];

type Members = Effect.Success<
  ReturnType<InternalGuildsPersistence["findMembersWithRoles"]>
>;

const member = (guildId: string): Members[number] => ({
  ...createMemberFixture({
    guildId,
    userId: identity.discordId,
    globalUserId: identity.userId,
  }),
  roles: [
    {
      id: `role-${guildId}`,
      guildId,
      name: "Readers",
      color: null,
      position: 1,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      lvlRangeFrom: 1,
      lvlRangeTo: 500,
      permissions: [...grantedPermissions],
    },
  ],
});

const setup = async () => {
  let members: Members = [member("organization-1"), member("organization-2")];
  const apiRedis = createPermissionCacheBoundary();

  const api = makeInternalGuildsData(
    {
      findActiveGuild: () => Effect.succeed(null),
      findGuildsForPermissions: () =>
        Effect.sync(() =>
          members
            .filter((entry) => entry.active)
            .map(({ guildId }) => createGuildFixture({ id: guildId })),
        ),
      findMembersWithRoles: () => Effect.sync(() => structuredClone(members)),
    },
    apiRedis.cache,
  );

  const http = HttpClient.make((request) =>
    Effect.gen(function* () {
      const query = Schema.decodeUnknownSync(InternalUserPermissionsQuery)(
        Object.fromEntries(new URL(request.url).searchParams),
      );

      const permissions = yield* getInternalUserPermissions(
        query.discordId,
        query.userId,
        query.freshness,
      ).pipe(Effect.provideService(InternalGuildsData, api));

      return HttpClientResponse.fromWeb(request, Response.json(permissions));
    }).pipe(Effect.orDie),
  );

  const redis = makeGuildStoreRedis(identity);

  const stores = [
    makeGuildStore(config, redis.store, http),
    makeGuildStore(config, redis.store, http),
  ];

  const listeners: Array<(message: FederatedRealtimeMessage) => void> = [];
  const background: Promise<void>[] = [];

  const federation = {
    subscribe: async (
      listener: (message: FederatedRealtimeMessage) => void,
      changed?: (subscribed: boolean) => void,
    ) => {
      listeners.push(listener);
      changed?.(true);
    },
    publish: async (message: FederatedRealtimeMessage) => {
      for (const listener of listeners) listener(message);
    },
  };

  const consumers = new Map<
    string,
    (delivery: RabbitDelivery) => Effect.Effect<void, unknown>
  >();

  const messaging: RabbitMessagingService = {
    publish: () => Effect.void,
    ack: () => Effect.void,
    nack: () => Effect.void,
    consume: (options, consume) =>
      Effect.sync(() => {
        consumers.set(options.queue, consume);

        return { consumerTag: options.queue, cancel: Effect.void };
      }),
  };

  const unexpected = () => {
    throw new Error("Unexpected presence Redis I/O for a web socket");
  };

  const replicas = stores.map((store) => {
    const hub = new RealtimeHub(config, federation, (_label, effect) => {
      background.push(Effect.runPromise(effect));
    });

    const presenceRedis = {
      command: {
        get: unexpected,
        set: unexpected,
        del: unexpected,
        expire: unexpected,
        sadd: unexpected,
        srem: unexpected,
        smembers: unexpected,
        mget: unexpected,
        incr: unexpected,
        eval: unexpected,
      },
    };

    const presence = new PresenceStore(presenceRedis, hub);
    const activity = new ActivityPublisher(messaging, config);

    const commands = new CommandHandler(
      store,
      makeMargonemProofVerifier(config, http),
      presence,
      hub,
      activity,
      new MapPingService(presenceRedis, hub),
      new BattlePingService(presenceRedis, hub),
      new AirTagService(presenceRedis, hub),
    );

    return { store, hub, commands, presence };
  });

  for (const replica of replicas) await Effect.runPromise(replica.hub.start());
  const first = replicas[0];

  if (!first) throw new Error("Missing first replica");

  const bridge = new RabbitBridge(
    messaging,
    first.hub,
    first.commands,
    first.presence,
    new CoveragePublisher(messaging),
  );

  await Effect.runPromise(Effect.scoped(bridge.start()));

  const join = async (
    replica: typeof first,
    connectionId: string,
    organizationIds?: string[],
  ) => {
    const frames: ReturnType<typeof decodeRealtimeFrame>[] = [];
    const closes: number[] = [];

    const data: SessionData = {
      ...identity,
      connectionId,
      platform: "web-app",
      joined: false,
      guilds: [],
      subscriptions: new Map(),
      airTagScopes: [],
      confidence: "reported",
    };

    if (organizationIds) {
      data.apiKeyAccess = {
        keyId: connectionId,
        organizationIds,
        mode: "read",
        personalData: false,
        expiresAt: null,
      };
      data.apiKeyLeaseExpiresAt = Date.now() + 60_000;
    }

    const socket: GatewaySocket = {
      data,
      send: (frame: Uint8Array) => {
        frames.push(decodeRealtimeFrame(frame));

        return 1;
      },
      close: (code) => {
        closes.push(code);
      },
      getBufferedAmount: () => 0,
    };

    replica.hub.register(socket);
    await Effect.runPromise(
      replica.commands.handle(
        socket,
        Buffer.from(
          encode({
            v: 1,
            type: "session.join",
            requestId: "join",
            data: {},
          }),
        ),
      ),
    );

    if (connectionId !== "reconnect" && !socket.data.joined)
      throw new Error(JSON.stringify(frames));
    frames.length = 0;

    return { socket, frames, closes };
  };

  const targets = [];

  for (const [index, replica] of replicas.entries()) {
    targets.push(await join(replica, `web-${index}`));
    targets.push(await join(replica, `key-1-${index}`, ["organization-1"]));
    targets.push(await join(replica, `key-2-${index}`, ["organization-2"]));
  }

  const deliverChange = async (
    routingKey:
      | typeof RabbitRoutingKey.GUILDS_MEMBERS_UPDATE
      | typeof RabbitRoutingKey.GUILDS_MEMBERS_REMOVE
      | typeof RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_ROLE,
  ) => {
    const spec = gatewayConsumerSpecs.find(
      (entry) => entry.routingKey === routingKey,
    );

    const consumer = spec && consumers.get(spec.queue);

    if (!consumer) throw new Error("Missing membership consumer");
    await Effect.runPromise(
      consumer(
        createRabbitDelivery(
          routingKey,
          Buffer.from(
            JSON.stringify({ ...identity, guildId: "organization-1" }),
          ),
        ),
      ),
    );
    await Promise.all(background.splice(0));
  };

  const publish = async (organizationId: string, npcLevel = 300) => {
    await first.hub.publishToScope(
      { topic: "organization.chat", organizationId },
      { v: 1, type: "chat.cleared", data: { organizationId, payload: {} } },
    );
    await first.hub.publishToScope(
      { topic: "organization.timers", organizationId },
      {
        v: 1,
        type: "timer.created",
        data: {
          organizationId,
          payload: { npc: { type: "HERO", lvl: npcLevel } },
        },
      },
    );
  };

  return {
    targets,
    replicas,
    api,
    apiRedis,
    join,
    first,
    publish,
    deliverChange,
    narrowLevelRange: () => {
      members = members.map((entry) =>
        entry.guildId !== "organization-1"
          ? entry
          : {
              ...entry,
              roles: entry.roles.map((role) => ({
                ...role,
                lvlRangeFrom: 100,
                lvlRangeTo: 200,
              })),
            },
      );
    },
    revoke: (removed: boolean) => {
      members = members.map((entry) =>
        entry.guildId !== "organization-1"
          ? entry
          : {
              ...entry,
              active: !removed,
              roles: entry.roles.map((role) => ({
                ...role,
                permissions: [
                  Permission.LOOTLOG_ACCESS,
                  Permission.LOOTLOG_TIMERS_READ,
                ],
              })),
            },
      );
    },
  };
};

for (const change of ["role", "membership"] as const) {
  test(`a warm API projection cannot restore revoked ${change} access on either gateway replica`, async () => {
    const system = await setup();
    await system.publish("organization-1");
    await system.publish("organization-2");

    for (const target of system.targets) {
      expect(target.frames).toHaveLength(
        target.socket.data.apiKeyAccess ? 2 : 4,
      );
      target.frames.length = 0;
    }

    system.revoke(change === "membership");

    // A warm, successful response remains stale until API invalidation arrives.
    // Reconciliation must demand fresh data instead of committing those grants.
    const stale = await Effect.runPromise(
      system.api.getUserPermissions(identity.discordId, identity.userId),
    );

    expect(stale).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          guild: expect.objectContaining({ id: "organization-1" }),
          roles: expect.arrayContaining([
            expect.objectContaining({
              permissions: expect.arrayContaining([
                Permission.LOOTLOG_CHAT_READ,
              ]),
            }),
          ]),
        }),
      ]),
    );
    await system.deliverChange(
      change === "membership"
        ? RabbitRoutingKey.GUILDS_MEMBERS_REMOVE
        : RabbitRoutingKey.GUILDS_MEMBERS_REMOVE_ROLE,
    );

    for (const target of system.targets) target.frames.length = 0;
    await system.publish("organization-1");
    await system.publish("organization-2");

    for (const target of system.targets) {
      const scopedToRevoked =
        target.socket.data.apiKeyAccess?.organizationIds.includes(
          "organization-1",
        );

      expect(target.frames).toHaveLength(scopedToRevoked ? 0 : 2);
      expect(
        target.frames.every(
          (frame) =>
            "type" in frame &&
            "organizationId" in frame.data &&
            frame.data.organizationId === "organization-2",
        ),
      ).toBe(true);
      expect(target.closes).toEqual(
        change === "membership" && scopedToRevoked ? [1008] : [],
      );

      if (change === "membership")
        expect(
          target.socket.data.guilds.some(
            ({ guild }) => guild.id === "organization-1",
          ),
        ).toBe(false);
    }

    // A subsequent join must use the revised gateway projection, not the warm API grant.
    const reconnect = await system.join(system.first, "reconnect", [
      "organization-1",
    ]);

    expect(reconnect.socket.data.joined).toBe(change !== "membership");
    await system.publish("organization-1");
    expect(reconnect.frames).toEqual([]);
  });
}

test("narrowing NPC levels revokes out-of-range deliveries on both replicas without removing chat or in-range access", async () => {
  const system = await setup();
  await system.publish("organization-1");

  for (const target of system.targets) {
    const canReadOrganization =
      !target.socket.data.apiKeyAccess ||
      target.socket.data.apiKeyAccess.organizationIds.includes(
        "organization-1",
      );

    expect(target.frames).toHaveLength(canReadOrganization ? 2 : 0);
    target.frames.length = 0;
  }

  system.narrowLevelRange();

  const stale = await Effect.runPromise(
    system.api.getUserPermissions(identity.discordId, identity.userId),
  );

  expect(stale).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        guild: expect.objectContaining({ id: "organization-1" }),
        roles: expect.arrayContaining([
          expect.objectContaining({ lvlRangeTo: 500 }),
        ]),
      }),
    ]),
  );
  await system.deliverChange(RabbitRoutingKey.GUILDS_MEMBERS_UPDATE);

  for (const target of system.targets) target.frames.length = 0;
  await system.publish("organization-1", 300);
  await system.publish("organization-1", 150);
  await system.publish("organization-2", 300);

  for (const target of system.targets) {
    const organizationIds = target.socket.data.apiKeyAccess
      ?.organizationIds ?? ["organization-1", "organization-2"];

    const expected = [];

    if (organizationIds.includes("organization-1")) {
      expected.push(
        { type: "chat.cleared", data: { organizationId: "organization-1" } },
        { type: "chat.cleared", data: { organizationId: "organization-1" } },
        {
          type: "timer.created",
          data: {
            organizationId: "organization-1",
            payload: { npc: { lvl: 150 } },
          },
        },
      );
    }

    if (organizationIds.includes("organization-2")) {
      expected.push(
        { type: "chat.cleared", data: { organizationId: "organization-2" } },
        {
          type: "timer.created",
          data: {
            organizationId: "organization-2",
            payload: { npc: { lvl: 300 } },
          },
        },
      );
    }

    expect(target.frames).toMatchObject(expected);
    expect(target.closes).toEqual([]);
  }
});
