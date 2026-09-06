import { Permission } from "@lootlog/schema/permissions";
import { describe, expect, test } from "bun:test";
import { decodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import type {
  RabbitDelivery,
  RabbitMessagingService,
} from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect } from "effect";
import type { GatewayConfiguration } from "#src/config/gateway-config";
import type {
  FederatedRealtimeMessage,
  RedisGatewayStore,
} from "#src/platform/redis-store";
import { getScopeKey, RealtimeHub } from "./realtime-hub.js";
import { RabbitBridge } from "#src/rabbit/rabbit-bridge";
import type { GatewaySocket, SessionData } from "./session.js";

class FederationBus {
  readonly listeners: Array<(message: FederatedRealtimeMessage) => void> = [];
}

class FakeRedisStore {
  readonly command = {
    set: async () => "OK",
    del: async () => 1,
    sadd: async () => 1,
    srem: async () => 1,
    expire: async () => 1,
    smembers: async () => [],
    mget: async () => [],
  };

  constructor(private readonly bus: FederationBus) {}

  async subscribe(
    listener: (message: FederatedRealtimeMessage) => void,
  ): Promise<void> {
    this.bus.listeners.push(listener);
  }

  async publish(message: FederatedRealtimeMessage): Promise<void> {
    for (const listener of this.bus.listeners) {
      listener(message);
      listener(message);
    }
  }
}

const config = {
  maxBackpressureBytes: 1_024,
  maxBackpressureStrikes: 3,
} as GatewayConfiguration;

const makeSession = (connectionId: string): SessionData => ({
  discordId: `discord-${connectionId}`,
  userId: `user-${connectionId}`,
  connectionId,
  platform: "web-app",
  joined: true,
  guilds: [],
  subscriptions: new Map(),
  airTagScopes: [],
  confidence: "reported",
  backpressureStrikes: 0,
});

const makeSocket = (
  data: SessionData,
  bufferedAmount = 0,
): {
  readonly socket: GatewaySocket;
  readonly sent: Uint8Array[];
  readonly closes: number[];
} => {
  const sent: Uint8Array[] = [];
  const closes: number[] = [];
  const socket = {
    data,
    getBufferedAmount: () => bufferedAmount,
    send: (bytes: Uint8Array) => {
      sent.push(bytes);
      return bytes.byteLength;
    },
    close: (code: number) => {
      closes.push(code);
    },
  } as unknown as GatewaySocket;
  return { socket, sent, closes };
};

describe("RealtimeHub federation", () => {
  test("filters kill and loot source visibility before local and remote delivery, preserving retries", async () => {
    const bus = new FederationBus();
    const stores = [new FakeRedisStore(bus), new FakeRedisStore(bus)];
    const hubs = stores.map(
      (store) => new RealtimeHub(config, store as unknown as RedisGatewayStore),
    );
    const scope = {
      topic: "organization.loots",
      organizationId: "organization-1",
    } as const;
    const role = (permissions: Permission[], from = 0, to = 500) => ({
      id: crypto.randomUUID(),
      permissions,
      lvlRangeFrom: from,
      lvlRangeTo: to,
    });
    const read = [
      Permission.LOOTLOG_LOOTS_READ,
      Permission.LOOTLOG_LOOTS_HEROES_READ,
    ];
    const variants = [
      { name: "visible", roles: [role(read)] },
      { name: "low-level", roles: [role(read, 0, 99)] },
      { name: "hidden-type", roles: [role([Permission.LOOTLOG_LOOTS_READ])] },
      {
        name: "split-role",
        roles: [
          role([Permission.LOOTLOG_LOOTS_READ], 0, 99),
          role([Permission.LOOTLOG_LOOTS_HEROES_READ], 100, 200),
        ],
      },
      { name: "admin", roles: [role([Permission.ADMIN])] },
      { name: "owner", roles: [] },
      { name: "game", roles: [role(read)] },
      { name: "other-guild", roles: [role(read)] },
      { name: "legacy", roles: [role(read)] },
    ];
    const targets = hubs.map((hub, index) =>
      variants.map((variant) => {
        const session = makeSession(`${index}-${variant.name}`);
        Object.assign(session, { supportsFeed: variant.name !== "legacy" });
        if (variant.name === "game")
          Object.assign(session, { platform: "game" });
        session.guilds = [
          {
            guild: {
              id:
                variant.name === "other-guild"
                  ? "organization-2"
                  : "organization-1",
              ownerId:
                variant.name === "owner" ? session.discordId : "other-owner",
            },
            roles: variant.roles,
          },
        ];
        session.subscriptions.set(getScopeKey(scope), scope);
        const target = makeSocket(session);
        hub.register(target.socket);
        return target;
      }),
    );
    const handlers = new Map<
      string,
      (delivery: RabbitDelivery) => Effect.Effect<void, unknown>
    >();
    const messaging: RabbitMessagingService = {
      publish: () => Effect.void,
      ack: () => Effect.void,
      nack: () => Effect.void,
      consume: (options, handler) =>
        Effect.sync(() => {
          handlers.set(options.queue, handler);
          return { consumerTag: options.queue, cancel: Effect.void };
        }),
    };
    const unexpected = () => {
      throw new Error("Unexpected control handler");
    };
    const bridge = new RabbitBridge(
      messaging,
      hubs[0]!,
      { rebalanceAcrossInstances: unexpected },
      { coverageForMap: unexpected },
      { publish: unexpected },
    );
    const feedEntry = {
      id: "kill:organization-1:tempest:1:minute",
      type: "kill" as const,
      version: 1,
      occurredAt: "2026-09-06T12:00:00.000Z",
      world: "tempest",
      guild: { id: "organization-1", name: "Organization", vanityUrl: null },
      npc: { id: 1, name: "Hero", type: "HERO", lvl: 100, icon: null },
      count: 1,
    };
    const payload = {
      version: 1,
      feedEntry,
      guildId: "organization-1",
      world: "tempest",
      npc: { type: "HERO", lvl: 100 },
    };
    const content = Buffer.from(JSON.stringify(payload));
    const properties: RabbitDelivery["properties"] = {
      messageId: "accepted-kill-1",
      contentType: "application/json",
      contentEncoding: undefined,
      headers: {},
      deliveryMode: 2,
      priority: undefined,
      correlationId: undefined,
      replyTo: undefined,
      expiration: undefined,
      timestamp: undefined,
      type: undefined,
      userId: undefined,
      appId: undefined,
      clusterId: undefined,
    };
    const fields = {
      consumerTag: "kill-test",
      deliveryTag: 1,
      exchange: "default",
      routingKey: RabbitRoutingKey.GUILDS_KILLS_ACCEPTED_V1,
      redelivered: true,
    };
    const delivery: RabbitDelivery = {
      content,
      properties,
      ...fields,
      raw: { content, properties, fields },
    };
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          for (const hub of hubs) yield* hub.start();
          yield* bridge.start();
          const handler = handlers.get("gateway-guilds-kills-accepted-v1");
          if (!handler) throw new Error("Missing kill consumer");
          const firstStore = stores[0]!;
          const publish = firstStore.publish.bind(firstStore);
          firstStore.publish = async () => {
            throw new Error("Redis unavailable");
          };
          expect((yield* handler(delivery).pipe(Effect.result))._tag).toBe(
            "Failure",
          );
          firstStore.publish = publish;
          yield* handler(delivery);
          yield* handler(delivery);
          for (const group of targets)
            expect(group.map((target) => target.sent.length)).toEqual([
              2, 0, 0, 0, 2, 2, 0, 0, 0,
            ]);
          for (const group of targets)
            expect(decodeRealtimeFrame(group[0]!.sent[1]!)).toEqual({
              v: 1,
              type: "feed.entry",
              data: feedEntry,
            });
          const lootHandler = handlers.get("gateway-guilds-loots-create");
          if (!lootHandler) throw new Error("Missing loot consumer");
          const { count: _count, ...baseEntry } = feedEntry;
          const lootEntry = {
            ...baseEntry,
            id: "loot:organization-1:1",
            type: "loot" as const,
            lootId: 1,
            items: [],
            additionalItemsCount: 0,
          };
          const lootPayload = {
            version: 2,
            guildId: "organization-1",
            lootId: 1,
            npcs: [{ type: "HERO", lvl: 100 }],
            feedEntry: lootEntry,
          };
          const lootContent = Buffer.from(JSON.stringify(lootPayload));
          const lootFields = {
            ...fields,
            routingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE,
          };
          const lootProperties = { ...properties, messageId: "loot-visible" };
          const lootDelivery = {
            ...lootFields,
            content: lootContent,
            properties: lootProperties,
            raw: {
              content: lootContent,
              properties: lootProperties,
              fields: lootFields,
            },
          };
          yield* lootHandler(lootDelivery);
          yield* lootHandler(lootDelivery);
          for (const group of targets) {
            expect(group.map((target) => target.sent.length)).toEqual([
              4, 0, 0, 0, 2, 4, 1, 0, 1,
            ]);
            expect(decodeRealtimeFrame(group[0]!.sent[2]!)).toEqual({
              v: 1,
              type: "loot.created",
              data: {
                version: 2,
                guildId: "organization-1",
                lootId: 1,
                npcs: [{ type: "HERO", lvl: 100 }],
              },
            });
            expect(decodeRealtimeFrame(group[0]!.sent[3]!)).toEqual({
              v: 1,
              type: "feed.entry",
              data: lootEntry,
            });
          }
          for (const group of targets) group[0]!.socket.data.guilds = [];
          yield* Effect.promise(() =>
            hubs[0]!.publishToScope(
              scope,
              {
                v: 1,
                type: "kills.changed",
                data: { guildId: "organization-1" },
              },
              "after-revoke",
              {
                recipientPlatform: "web-app",
                sourceNpcs: [{ type: "HERO", level: 100 }],
              },
            ),
          );
          for (const group of targets) expect(group[0]!.sent).toHaveLength(4);
          yield* Effect.promise(() =>
            hubs[0]!.publishToScope(
              scope,
              {
                v: 1,
                type: "feed.entry",
                data: { ...feedEntry, version: 2, count: 2 },
              },
              "feed-after-revoke",
              {
                recipientPlatform: "web-app",
                sourceNpcs: [{ type: "HERO", level: 100 }],
              },
            ),
          );
          for (const group of targets) {
            expect(group[0]!.sent).toHaveLength(4);
            expect(group[1]!.sent).toHaveLength(0);
            expect(group[2]!.sent).toHaveLength(0);
            expect(group[3]!.sent).toHaveLength(0);
            expect(group[6]!.sent).toHaveLength(1);
            expect(group[7]!.sent).toHaveLength(0);
          }
        }),
      ),
    );
  });

  test("deduplicates outbox replays across gateways without losing a failed federation publish", async () => {
    const bus = new FederationBus();
    const firstStore = new FakeRedisStore(bus);
    const first = new RealtimeHub(
      config,
      firstStore as unknown as RedisGatewayStore,
    );
    const second = new RealtimeHub(
      config,
      new FakeRedisStore(bus) as unknown as RedisGatewayStore,
    );
    const targets = [first, second].map((hub, index) => {
      const target = makeSocket(makeSession(`loot-${index}`));
      for (const organizationId of ["organization-1", "organization-2"]) {
        const scope = { topic: "organization.loots", organizationId } as const;
        target.socket.data.subscriptions.set(getScopeKey(scope), scope);
        target.socket.data.guilds.push({
          guild: { id: organizationId, ownerId: target.socket.data.discordId },
          roles: [],
        });
      }
      hub.register(target.socket);
      return target;
    });
    const handlers = [first, second].map(
      () =>
        new Map<
          string,
          (delivery: RabbitDelivery) => Effect.Effect<void, unknown>
        >(),
    );
    const bridges = [first, second].map((hub, index) => {
      const messaging: RabbitMessagingService = {
        publish: () => Effect.void,
        ack: () => Effect.void,
        nack: () => Effect.void,
        consume: (options, handler) =>
          Effect.sync(() => {
            handlers[index]?.set(options.queue, handler);
            return { consumerTag: options.queue, cancel: Effect.void };
          }),
      };
      const unexpected = () => {
        throw new Error("Unexpected non-loot handler");
      };
      return new RabbitBridge(
        messaging,
        hub,
        { rebalanceAcrossInstances: unexpected },
        { coverageForMap: unexpected },
        { publish: unexpected },
      );
    });
    const deliver = (
      instance: number,
      messageId?: string,
      guildId = "organization-1",
    ) => {
      const handler = handlers[instance]?.get("gateway-guilds-loots-create");
      if (!handler) throw new Error("Loot consumer not started");
      const content = Buffer.from(
        JSON.stringify({ version: 2, guildId, lootId: 42, npcs: [] }),
      );
      const properties: RabbitDelivery["properties"] = {
        messageId,
        contentType: "application/json",
        contentEncoding: undefined,
        headers: {},
        deliveryMode: 2,
        priority: undefined,
        correlationId: undefined,
        replyTo: undefined,
        expiration: undefined,
        timestamp: undefined,
        type: undefined,
        userId: undefined,
        appId: undefined,
        clusterId: undefined,
      };
      const fields = {
        consumerTag: "gateway-guilds-loots-create",
        deliveryTag: 1,
        exchange: "default",
        routingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE,
        redelivered: false,
      };
      return handler({
        content,
        properties,
        ...fields,
        raw: { content, properties, fields },
      });
    };
    const frames = () =>
      targets.map((target) =>
        target.sent.map((bytes) => decodeRealtimeFrame(bytes)),
      );
    const event = (guildId = "organization-1") =>
      ({
        v: 1,
        type: "loot.created",
        data: { version: 2, guildId, lootId: 42, npcs: [] },
      }) as const;

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          yield* first.start();
          yield* second.start();
          for (const bridge of bridges) yield* bridge.start();
          const publish = firstStore.publish.bind(firstStore);
          firstStore.publish = async () => {
            throw new Error("Redis unavailable");
          };
          const failed = yield* deliver(0, "loot-publication:1").pipe(
            Effect.result,
          );
          expect(failed._tag).toBe("Failure");
          expect(frames()).toEqual([[event()], []]);

          firstStore.publish = publish;
          yield* deliver(0, "loot-publication:1");
          yield* deliver(1, "loot-publication:1");
          expect(frames()).toEqual([[event()], [event()]]);

          yield* deliver(0, "loot-publication:2");
          yield* deliver(1, "loot-publication:1", "organization-2");
          yield* deliver(0);
          yield* deliver(1);
          const expected = [
            event(),
            event(),
            event("organization-2"),
            event(),
            event(),
          ];
          expect(frames()).toEqual([expected, expected]);
          for (const bridge of bridges) yield* bridge.stop();
        }),
      ),
    );
  });

  test("shares encoded broadcasts while retaining recipient filtering and backpressure", async () => {
    const hub = new RealtimeHub(
      config,
      new FakeRedisStore(new FederationBus()) as unknown as RedisGatewayStore,
    );
    const scope = {
      topic: "organization.chat",
      organizationId: "organization-1",
    } as const;
    const targets = [
      makeSocket(makeSession("first")),
      makeSocket(makeSession("second")),
      makeSocket(makeSession("slow"), 2_048),
      makeSocket(makeSession("other")),
    ];
    for (const [index, target] of targets.entries()) {
      if (index < 3)
        target.socket.data.subscriptions.set(getScopeKey(scope), scope);
      hub.register(target.socket);
    }
    const jsonFrames: string[] = [];
    const jsonSocket = {
      data: { ...makeSession("json-broadcast"), frameEncoding: "json" },
      getBufferedAmount: () => 0,
      send: (frame: string) => {
        jsonFrames.push(frame);
        return frame.length;
      },
    } as unknown as GatewaySocket;
    jsonSocket.data.subscriptions.set(getScopeKey(scope), scope);
    hub.register(jsonSocket);
    const event = {
      v: 1,
      type: "chat.created",
      data: { organizationId: "organization-1", payload: { id: "message-1" } },
    } as const;
    await hub.publishToScope(scope, event);
    expect(jsonFrames).toEqual([JSON.stringify(event)]);
    expect(targets[0]?.sent).toHaveLength(1);
    expect(targets[0]?.sent[0]).toBe(targets[1]?.sent[0]);
    expect(
      decodeRealtimeFrame(targets[0]?.sent[0] ?? new Uint8Array()),
    ).toEqual(event);
    expect(targets[2]?.sent).toEqual([]);
    expect(targets[2]?.socket.data.backpressureStrikes).toBe(1);
    expect(targets[3]?.sent).toEqual([]);
  });

  test("sends readable JSON to local diagnostic sockets", () => {
    const hub = new RealtimeHub(
      config,
      new FakeRedisStore(new FederationBus()) as unknown as RedisGatewayStore,
    );
    const data = { ...makeSession("json"), frameEncoding: "json" } as const;
    const sent: string[] = [];
    const socket = {
      data,
      getBufferedAmount: () => 0,
      send: (frame: string) => sent.push(frame),
    } as unknown as GatewaySocket;

    hub.sendEvent(socket, {
      v: 1,
      type: "chat.created",
      data: { organizationId: "organization-1", payload: { id: "message-1" } },
    });

    expect(sent).toEqual([
      JSON.stringify({
        v: 1,
        type: "chat.created",
        data: {
          organizationId: "organization-1",
          payload: { id: "message-1" },
        },
      }),
    ]);
  });

  test("fans permission rebalance out to every instance once", async () => {
    const bus = new FederationBus();
    const first = new RealtimeHub(
      config,
      new FakeRedisStore(bus) as unknown as RedisGatewayStore,
    );
    const second = new RealtimeHub(
      config,
      new FakeRedisStore(bus) as unknown as RedisGatewayStore,
    );
    await Effect.runPromise(first.start());
    await Effect.runPromise(second.start());
    const received: string[] = [];
    second.onPermissionRebalance((discordId, userId) =>
      Effect.sync(() => received.push(`${discordId}:${userId}`)).pipe(
        Effect.asVoid,
      ),
    );
    await Effect.runPromise(
      first.publishPermissionRebalance("discord-1", "user-1"),
    );
    await Bun.sleep(0);
    expect(received).toEqual(["discord-1:user-1"]);
  });

  test("delivers a federated event once to an exact logical subscription", async () => {
    const bus = new FederationBus();
    const first = new RealtimeHub(
      config,
      new FakeRedisStore(bus) as unknown as RedisGatewayStore,
    );
    const second = new RealtimeHub(
      config,
      new FakeRedisStore(bus) as unknown as RedisGatewayStore,
    );
    await Effect.runPromise(first.start());
    await Effect.runPromise(second.start());
    const scope = {
      topic: "organization.chat",
      organizationId: "organization-1",
    } as const;
    const target = makeSocket(makeSession("target"));
    target.socket.data.subscriptions.set(getScopeKey(scope), scope);
    second.register(target.socket);

    await first.publishToScope(scope, {
      v: 1,
      type: "chat.created",
      data: { organizationId: "organization-1", payload: { id: "message-1" } },
    });

    expect(target.sent).toHaveLength(1);
    expect(
      decodeRealtimeFrame(target.sent[0] ?? new Uint8Array()),
    ).toHaveProperty("type", "chat.created");
  });

  test("closes a persistently slow consumer with bounded backpressure", async () => {
    const bus = new FederationBus();
    const hub = new RealtimeHub(
      { ...config, maxBackpressureBytes: 1 } as GatewayConfiguration,
      new FakeRedisStore(bus) as unknown as RedisGatewayStore,
    );
    await Effect.runPromise(hub.start());
    const scope = {
      topic: "organization.chat",
      organizationId: "organization-1",
    } as const;
    const target = makeSocket(makeSession("slow"), 10);
    target.socket.data.subscriptions.set(getScopeKey(scope), scope);
    hub.register(target.socket);
    const event = {
      v: 1,
      type: "chat.created",
      data: { organizationId: "organization-1", payload: {} },
    } as const;
    await hub.publishToScope(scope, event);
    await hub.publishToScope(scope, event);
    await hub.publishToScope(scope, event);
    expect(target.sent).toHaveLength(0);
    expect(target.closes).toEqual([1013]);
  });
});
