import { createRabbitDelivery } from "../../test/rabbit-fixtures.js";
import { Permission } from "@lootlog/schema/permissions";
import { describe, expect, test } from "bun:test";
import { decodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import type {
  RabbitDelivery,
  RabbitMessagingService,
} from "@lootlog/messaging";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect } from "effect";
import { decode, encode } from "@msgpack/msgpack";
import type { FederatedRealtimeMessage } from "#src/platform/redis-store";
import { getScopeKey, RealtimeHub } from "./realtime-hub.js";
import { RabbitBridge } from "#src/rabbit/rabbit-bridge";
import type { SessionData } from "./session.js";

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
};

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

const makeSocket = (data: SessionData, bufferedAmount = 0) => {
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
  };
  return { socket, sent, closes };
};

describe("RealtimeHub federation", () => {
  test("keeps local and federated delivery aligned through subscription changes and disconnect", async () => {
    const bus = new FederationBus();
    const hubs = [0, 1].map(
      () => new RealtimeHub(config, new FakeRedisStore(bus)),
    );
    const scope = {
      topic: "organization.chat",
      organizationId: "organization-1",
    } as const;
    const otherScope = { ...scope, organizationId: "organization-2" };
    const targets = hubs.map((hub, index) => {
      const target = makeSocket(makeSession(`lifecycle-${index}`));
      target.socket.data.subscriptions.set(getScopeKey(scope), scope);
      hub.register(target.socket);
      return target;
    });
    for (const hub of hubs) await Effect.runPromise(hub.start());
    const publish = async (organizationId = "organization-1") => {
      await hubs[0]?.publishToScope(
        { ...scope, organizationId },
        {
          v: 1,
          type: "chat.cleared",
          data: { organizationId, payload: {} },
        },
      );
    };
    const counts = () => targets.map((target) => target.sent.length);
    await publish();
    expect(counts()).toEqual([1, 1]);
    hubs.forEach((hub, index) => {
      const target = targets[index];
      if (!target) throw new Error("Missing lifecycle target");
      hub.subscribe(target.socket, scope);
      hub.unsubscribe(target.socket, scope);
    });
    await publish();
    expect(counts()).toEqual([1, 1]);
    hubs.forEach((hub, index) => {
      const target = targets[index];
      if (!target) throw new Error("Missing lifecycle target");
      hub.subscribe(target.socket, scope);
      hub.replaceSubscriptions(target.socket, [otherScope, otherScope]);
    });
    await publish();
    expect(counts()).toEqual([1, 1]);
    await publish("organization-2");
    expect(counts()).toEqual([2, 2]);
    hubs.forEach((hub, index) => {
      const target = targets[index];
      if (!target) throw new Error("Missing lifecycle target");
      hub.unregister(target.socket);
      // An asynchronous subscription request may finish after the socket closes.
      hub.subscribe(target.socket, otherScope);
    });
    await publish("organization-2");
    expect(counts()).toEqual([2, 2]);
  });

  test("matches every optional scope dimension and delivers overlapping scopes only once", async () => {
    const hub = new RealtimeHub(
      config,
      new FakeRedisStore(new FederationBus()),
    );
    const scope = {
      topic: "organization.chat",
      organizationId: "organization-1",
      world: "tempest",
      mapId: 0,
      eventId: "event-1",
    } as const;
    const subscriptions = [
      { topic: scope.topic },
      { topic: scope.topic, organizationId: scope.organizationId },
      { topic: scope.topic, world: scope.world },
      { topic: scope.topic, mapId: scope.mapId },
      { topic: scope.topic, eventId: scope.eventId },
      scope,
      { ...scope, topic: "organization.timers" },
      { ...scope, organizationId: "organization-2" },
      { ...scope, world: "other-world" },
      { ...scope, mapId: 1 },
      { ...scope, eventId: "other-event" },
    ] as const;
    const targets = subscriptions.map((subscription, index) => {
      const target = makeSocket(makeSession(`dimension-${index}`));
      hub.register(target.socket);
      hub.subscribe(target.socket, subscription);
      return target;
    });
    const overlapping = makeSocket(makeSession("overlapping"));
    hub.register(overlapping.socket);
    for (const subscription of subscriptions.slice(0, 6))
      hub.subscribe(overlapping.socket, subscription);
    const event = {
      v: 1,
      type: "chat.cleared",
      data: { organizationId: scope.organizationId, payload: {} },
    } as const;
    await hub.publishToScopes(
      [scope, scope, { ...scope, eventId: "event-2" }],
      event,
    );
    expect(targets.map((target) => target.sent.length)).toEqual([
      1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0,
    ]);
    expect(overlapping.sent).toHaveLength(1);
    await hub.publishToScope({ topic: scope.topic }, event);
    expect(targets.map((target) => target.sent.length)).toEqual([
      2, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0,
    ]);
    expect(overlapping.sent).toHaveLength(2);
    hub.unsubscribe(overlapping.socket, scope);
    await hub.publishToScope(scope, event);
    expect(overlapping.sent).toHaveLength(3);
  });

  test("keeps literal delimiters distinct and removes only the replaced or unsubscribed scope", async () => {
    const hub = new RealtimeHub(
      config,
      new FakeRedisStore(new FederationBus()),
    );
    const first = {
      topic: "organization.chat",
      organizationId: "organization-1",
      eventId: "a|b",
      world: "c",
    } as const;
    const second = { ...first, eventId: "a", world: "b|c" };
    const wildcard = {
      topic: first.topic,
      organizationId: first.organizationId,
    };
    const firstTarget = makeSocket(makeSession("literal-first"));
    const secondTarget = makeSocket(makeSession("literal-second"));
    hub.register(firstTarget.socket);
    hub.register(secondTarget.socket);
    hub.subscribe(firstTarget.socket, first);
    hub.subscribe(secondTarget.socket, second);
    const event = {
      v: 1,
      type: "chat.cleared",
      data: { organizationId: first.organizationId, payload: {} },
    } as const;
    await hub.publishToScope(first, event);
    expect([firstTarget.sent.length, secondTarget.sent.length]).toEqual([1, 0]);
    await hub.publishToScope(second, event);
    expect([firstTarget.sent.length, secondTarget.sent.length]).toEqual([1, 1]);
    hub.subscribe(firstTarget.socket, second);
    await hub.publishToScope(first, event);
    expect(firstTarget.sent).toHaveLength(1);
    hub.subscribe(firstTarget.socket, wildcard);
    hub.unsubscribe(firstTarget.socket, second);
    await hub.publishToScope(second, event);
    expect(firstTarget.sent).toHaveLength(2);
    hub.unsubscribe(firstTarget.socket, wildcard);
    await hub.publishToScopes([first, second], event);
    expect(firstTarget.sent).toHaveLength(2);
  });

  test("sends canonical JSON and MessagePack locally and remotely and rejects malformed federation frames", async () => {
    const bus = new FederationBus();
    const store = new FakeRedisStore(bus);
    const local = new RealtimeHub(config, store);
    const remote = new RealtimeHub(config, new FakeRedisStore(bus));
    const scope = {
      topic: "organization.chat",
      organizationId: "organization-1",
    } as const;
    const targets = [local, remote].map((hub, index) => {
      const binary = makeSocket(makeSession(`canonical-binary-${index}`));
      const json: string[] = [];
      const jsonSocket = {
        data: {
          ...makeSession(`canonical-json-${index}`),
          frameEncoding: "json" as const,
        },
        getBufferedAmount: () => 0,
        send: (frame: string) => json.push(frame),
        close: () => {},
      };
      for (const socket of [binary.socket, jsonSocket]) {
        hub.register(socket);
        hub.subscribe(socket, scope);
      }
      return { binary: binary.sent, json };
    });
    await Effect.runPromise(local.start());
    await Effect.runPromise(remote.start());
    const canonical = {
      v: 1,
      type: "chat.cleared",
      data: {
        organizationId: scope.organizationId,
        payload: { id: "message-1" },
      },
    } as const;
    const withUnknownFields = {
      ...canonical,
      untrusted: "strip",
      data: { ...canonical.data, untrusted: "strip" },
    };
    await local.publishToScope(scope, withUnknownFields);
    await store.publish({
      id: "raw-federation",
      sourceInstanceId: "external-instance",
      scope,
      frame: Buffer.from(encode(withUnknownFields)).toString("base64"),
    });
    for (const target of targets) {
      // Decode the wire bytes without the protocol schema, which would hide leaked fields.
      expect(target.binary.map((bytes) => decode(bytes))).toEqual([
        canonical,
        canonical,
      ]);
      expect(target.json.map((frame) => JSON.parse(frame))).toEqual([
        canonical,
        canonical,
      ]);
    }
    for (const [index, bytes] of [
      new Uint8Array([0xc1]),
      encode({ ...canonical, v: 2 }),
      encode({ v: 1, type: "session.join", data: {} }),
    ].entries()) {
      await store.publish({
        id: `malformed-federation-${index}`,
        sourceInstanceId: "external-instance",
        scope,
        frame: Buffer.from(bytes).toString("base64"),
      });
    }
    for (const target of targets) {
      expect(target.binary).toHaveLength(2);
      expect(target.json).toHaveLength(2);
    }
  });

  test("targets every user or Discord connection across gateways without subscriptions", async () => {
    const bus = new FederationBus();
    const hubs = [0, 1].map(
      () => new RealtimeHub(config, new FakeRedisStore(bus)),
    );
    const targets = hubs.map((hub, index) =>
      ["shared", "shared", "other"].map((identity, connection) => {
        const target = makeSocket({
          ...makeSession(`identity-${index}-${connection}`),
          userId: `user-${identity}`,
          discordId: `discord-${identity}`,
        });
        hub.register(target.socket);
        return target;
      }),
    );
    for (const hub of hubs) await Effect.runPromise(hub.start());
    const event = {
      v: 1,
      type: "chat.cleared",
      data: { organizationId: "organization-1", payload: {} },
    } as const;
    await hubs[0]?.publishToUser("user-shared", event);
    await hubs[0]?.publishToDiscord("discord-other", event);
    for (const group of targets)
      expect(group.map((target) => target.sent.length)).toEqual([1, 1, 1]);
    hubs.forEach((hub, index) => {
      const target = targets[index]?.[0];
      if (!target) throw new Error("Missing identity target");
      hub.unregister(target.socket);
      expect(hub.getLocalSocketsForUser("user-shared")).toHaveLength(1);
    });
    await hubs[0]?.publishToDiscord("discord-shared", event);
    await hubs[0]?.publishToUser("user-other", event);
    for (const group of targets)
      expect(group.map((target) => target.sent.length)).toEqual([1, 2, 2]);
  });

  test("filters kill and loot source visibility before local and remote delivery, preserving retries", async () => {
    const bus = new FederationBus();
    const stores = [new FakeRedisStore(bus), new FakeRedisStore(bus)];
    const hubs = stores.map((store) => new RealtimeHub(config, store));
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
    const delivery = createRabbitDelivery(
      RabbitRoutingKey.GUILDS_KILLS_ACCEPTED_V1,
      content,
      "accepted-kill-1",
      true,
    );
    const properties = delivery.properties;
    const fields = delivery.raw.fields;
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
    const first = new RealtimeHub(config, firstStore);
    const second = new RealtimeHub(config, new FakeRedisStore(bus));
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
      return handler(
        createRabbitDelivery(
          RabbitRoutingKey.GUILDS_LOOTS_CREATE,
          content,
          messageId,
        ),
      );
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
      new FakeRedisStore(new FederationBus()),
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
      data: {
        ...makeSession("json-broadcast"),
        frameEncoding: "json" as const,
      },
      getBufferedAmount: () => 0,
      send: (frame: string) => {
        jsonFrames.push(frame);
        return frame.length;
      },
      close: () => {},
    };
    jsonSocket.data.subscriptions.set(getScopeKey(scope), scope);
    hub.register(jsonSocket);
    const event = {
      v: 1,
      type: "chat.cleared",
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
      new FakeRedisStore(new FederationBus()),
    );
    const data = { ...makeSession("json"), frameEncoding: "json" } as const;
    const sent: string[] = [];
    const socket = {
      data,
      getBufferedAmount: () => 0,
      send: (frame: string) => sent.push(frame),
      close: () => {},
    };

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
    const first = new RealtimeHub(config, new FakeRedisStore(bus));
    const second = new RealtimeHub(config, new FakeRedisStore(bus));
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
    const first = new RealtimeHub(config, new FakeRedisStore(bus));
    const second = new RealtimeHub(config, new FakeRedisStore(bus));
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
      type: "chat.cleared",
      data: { organizationId: "organization-1", payload: { id: "message-1" } },
    });

    expect(target.sent).toHaveLength(1);
    expect(
      decodeRealtimeFrame(target.sent[0] ?? new Uint8Array()),
    ).toHaveProperty("type", "chat.cleared");
  });

  test("closes a persistently slow consumer with bounded backpressure", async () => {
    const bus = new FederationBus();
    const hub = new RealtimeHub(
      { ...config, maxBackpressureBytes: 1 },
      new FakeRedisStore(bus),
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
      type: "chat.cleared",
      data: { organizationId: "organization-1", payload: {} },
    } as const;
    await hub.publishToScope(scope, event);
    await hub.publishToScope(scope, event);
    await hub.publishToScope(scope, event);
    expect(target.sent).toHaveLength(0);
    expect(target.closes).toEqual([1013]);
  });
});

const npcDeliveryCases = (npcType: string, npcLevel: number, tier: string) =>
  [
    [
      "timers update",
      "gateway-guilds-timers-update",
      "organization.timers",
      { npc: { lvl: npcLevel, type: npcType } },
    ],
    [
      "timers delete",
      "gateway-guilds-timers-delete",
      "organization.timers",
      { npcId: 105, routing: { tier, npcLevel } },
    ],
    [
      "NPC chat",
      "gateway-guilds-send-message",
      "organization.chat",
      { type: "NPC", npc: { lvl: npcLevel, type: npcType } },
    ],
    [
      "NPC party chat",
      "gateway-guilds-send-message",
      "organization.chat",
      { type: "PARTY_GATHERING", npc: { lvl: npcLevel, type: npcType } },
    ],
    [
      "chat edit",
      "gateway-guilds-update-message",
      "organization.chat",
      {
        messageId: "message",
        message: "changed",
        routing: { tier, npcLevel },
      },
    ],
    [
      "chat delete",
      "gateway-guilds-delete-message",
      "organization.chat",
      { messageId: "message", routing: { tier, npcLevel } },
    ],
    [
      "NPC notification",
      "gateway-guilds-send-notification",
      "organization.notifications",
      { npc: { lvl: npcLevel, type: npcType } },
    ],
    [
      "loot share",
      "gateway-guilds-loots-share-update",
      "organization.loots",
      {
        version: 2,
        lootId: 1,
        npcs: [{ lvl: npcLevel, type: npcType }],
        lootShare: {},
      },
    ],
  ] as const;
const npcReadPermissions = [
  Permission.LOOTLOG_TIMERS_READ,
  Permission.LOOTLOG_TIMERS_HEROES_READ,
  Permission.LOOTLOG_CHAT_READ,
  Permission.LOOTLOG_CHAT_HEROES_READ,
  Permission.LOOTLOG_NOTIFICATIONS_READ,
  Permission.LOOTLOG_NOTIFICATIONS_HEROES_READ,
  Permission.LOOTLOG_LOOTS_READ,
  Permission.LOOTLOG_LOOTS_HEROES_READ,
];
const allNpcReadPermissions = [
  ...npcReadPermissions,
  Permission.LOOTLOG_TIMERS_TITANS_READ,
  Permission.LOOTLOG_CHAT_TITANS_READ,
  Permission.LOOTLOG_NOTIFICATIONS_TITANS_READ,
  Permission.LOOTLOG_LOOTS_TITANS_READ,
];
for (const scenario of [
  {
    name: "level range",
    type: "HERO",
    level: 105,
    tier: "heroes",
    permissions: allNpcReadPermissions,
    from: 200,
  },
  {
    name: "titan permission",
    type: "TITAN",
    level: 250,
    tier: "titans",
    permissions: npcReadPermissions,
    from: 200,
  },
  {
    name: "hero permission",
    type: "HERO",
    level: 250,
    tier: "heroes",
    permissions: npcReadPermissions.filter(
      (permission) => !permission.endsWith("HEROES_READ"),
    ),
    from: 200,
  },
]) {
  for (const [name, queue, topic, data] of npcDeliveryCases(
    scenario.type,
    scenario.level,
    scenario.tier,
  )) {
    test(`${name} requires ${scenario.name} on game and web across gateways`, async () => {
      const bus = new FederationBus();
      const hubs = [0, 1].map(
        () => new RealtimeHub(config, new FakeRedisStore(bus)),
      );
      const scope = { topic, organizationId: "organization-1" };
      const targets = hubs.flatMap((hub, i) =>
        ["game", "web-app"].flatMap((platform) =>
          [false, true].map((allowed) => {
            const session = makeSession(`${i}-${platform}-${allowed}`);
            Object.assign(session, { platform });
            session.guilds = [
              {
                guild: { id: "organization-1", ownerId: "owner" },
                roles: [
                  {
                    id: "permission",
                    permissions: allowed
                      ? allNpcReadPermissions
                      : scenario.permissions,
                    lvlRangeFrom: allowed ? 0 : scenario.from,
                    lvlRangeTo: 500,
                  },
                  {
                    id: "empty",
                    permissions: [],
                    lvlRangeFrom: 0,
                    lvlRangeTo: 500,
                  },
                ],
              },
            ];

            const t = makeSocket(session);
            hub.register(t.socket);
            hub.subscribe(t.socket, scope);
            return { ...t, allowed };
          }),
        ),
      );
      const handlers = new Map<
        string,
        (d: RabbitDelivery) => Effect.Effect<void, unknown>
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
        throw new Error("unexpected control");
      };
      const bridge = new RabbitBridge(
        messaging,
        hubs[0]!,
        { rebalanceAcrossInstances: unexpected },
        { coverageForMap: unexpected },
        { publish: unexpected },
      );
      for (const hub of hubs) await Effect.runPromise(hub.start());
      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            yield* bridge.start();
            const content = Buffer.from(
              JSON.stringify({ guildId: "organization-1", ...data }),
            );
            const delivery = createRabbitDelivery(
              queue,
              content,
              "npc-delivery",
            );
            yield* handlers.get(queue)!(delivery);
            for (const t of targets.filter((t) => t.allowed))
              expect(t.sent).toHaveLength(1);

            for (const t of targets.filter((t) => !t.allowed))
              expect(t.sent).toHaveLength(0);
          }),
        ),
      );
    });
  }
}

test("chat capabilities are recipient-specific and cannot be supplied by the sender", async () => {
  const hub = new RealtimeHub(config, new FakeRedisStore(new FederationBus()));
  const scope = {
    topic: "organization.chat",
    organizationId: "organization-1",
  } as const;
  const viewers = [
    {
      id: "author",
      permissions: [
        Permission.LOOTLOG_CHAT_READ,
        Permission.LOOTLOG_CHAT_WRITE,
      ],
      canEdit: true,
      canDelete: true,
    },
    {
      id: "reader",
      permissions: [Permission.LOOTLOG_CHAT_READ],
      canEdit: false,
      canDelete: false,
    },
    {
      id: "reader-2",
      permissions: [Permission.LOOTLOG_CHAT_READ],
      canEdit: false,
      canDelete: false,
    },
    {
      id: "admin",
      permissions: [Permission.ADMIN],
      canEdit: false,
      canDelete: true,
    },
    { id: "owner", permissions: [], canEdit: false, canDelete: true },
  ];
  const targets = viewers.map((viewer) => {
    const session = { ...makeSession(viewer.id), discordId: viewer.id };
    session.guilds = [
      {
        guild: { id: "organization-1", ownerId: "owner" },
        roles: [
          {
            id: "role",
            permissions: viewer.permissions,
            lvlRangeFrom: 0,
            lvlRangeTo: 500,
          },
        ],
      },
    ];
    const target = makeSocket(session);
    hub.register(target.socket);
    hub.subscribe(target.socket, scope);
    return target;
  });
  await hub.publishToScope(scope, {
    v: 1,
    type: "chat.created",
    data: {
      organizationId: "organization-1",
      payload: {
        id: "message",
        guildId: "organization-1",
        senderId: "author",
        type: "NORMAL",
        message: "Hello",
        canEdit: true,
        canDelete: true,
      },
    },
  });
  for (const [index, viewer] of viewers.entries()) {
    const frame = targets[index]?.sent[0];
    expect(frame).toBeDefined();
    expect(decodeRealtimeFrame(frame ?? new Uint8Array())).toMatchObject({
      data: {
        payload: {
          id: "message",
          canEdit: viewer.canEdit,
          canDelete: viewer.canDelete,
        },
      },
    });
  }
  expect(targets[1]?.sent[0]).toBe(targets[2]?.sent[0]);
});
