import * as realtimeCodec from "@lootlog/protocol/realtime/codec";
import { makeRabbitBridgeHarness } from "../../test/rabbit-fixtures.js";
import {
  makeTestSocket,
  startHubs,
  unusedFederationStore,
  withApiKey,
  hubConfig,
  startPair,
  makeAdminSession,
} from "../../test/realtime-fixtures.js";
import { describe, expect, spyOn, test } from "bun:test";
import { decodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type {
  GlobalChatChannelUpdate,
  GlobalChatMessage,
} from "@lootlog/schema/chat";
import { Effect } from "effect";
import { RealtimeHub } from "./realtime-hub.js";

describe("RealtimeHub federation", () => {
  test("deduplicates outbox replays across gateways without losing a failed federation publish", async () => {
    const [first, second, bus] = await startPair();

    const targets = [first, second].map((hub, index) => {
      const target = makeTestSocket({
        ...makeAdminSession(`loot-${index}`),
        platform: "game",
      });

      for (const organizationId of ["organization-1", "organization-2"])
        target.socket.data.guilds.push({
          guild: { id: organizationId, ownerId: target.socket.data.discordId },
          roles: [],
        });

      hub.register(target.socket);

      for (const organizationId of ["organization-1", "organization-2"])
        hub.subscribe(target.socket, {
          topic: "organization.loots",
          organizationId,
        });

      return target;
    });

    const harnesses = [first, second].map((hub) =>
      makeRabbitBridgeHarness(hub),
    );

    const deliver = (
      instance: number,
      messageId?: string,
      guildId = "organization-1",
    ) => {
      const harness = harnesses[instance];

      if (!harness) throw new Error("Missing loot consumer");

      return harness.deliver(
        RabbitRoutingKey.GUILDS_LOOTS_CREATE,
        { version: 2, guildId, lootId: 42, npcs: [] },
        { messageId },
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
          for (const { bridge } of harnesses) yield* bridge.start();
          const publish = bus.store.publish;
          bus.store.publish = () =>
            Promise.reject(new Error("Redis unavailable"));

          const failed = yield* deliver(0, "loot-publication:1").pipe(
            Effect.result,
          );

          expect(failed._tag).toBe("Failure");
          expect(frames()).toEqual([[], []]);

          bus.store.publish = publish;
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

          for (const { bridge } of harnesses) yield* bridge.stop();
        }),
      ),
    );
  });

  test("fans permission rebalance out to every instance once", async () => {
    const [first, second] = await startPair();
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

  test("delivers a ready-room removal to a recipient who lost its Organization", async () => {
    const [first, second] = await startPair();

    const target = makeTestSocket(makeAdminSession("former-member"));

    second.register(target.socket);

    for (const payload of [
      { type: "UPSERT", projection: { guildIds: ["organization-3"] } },
      {
        schemaVersion: 3,
        type: "REMOVE",
        notificationId: "room-1",
        revision: 2,
      },
    ]) {
      await first.publishToDiscord(target.socket.data.discordId, {
        v: 1,
        type: "party-ready-room.updated",
        data: { organizationId: "organization-3", payload },
      });
    }

    expect(
      target.sent.map((bytes) => decodeRealtimeFrame(bytes)),
    ).toMatchObject([
      {
        type: "party-ready-room.updated",
        data: { payload: { type: "REMOVE" } },
      },
    ]);
  });

  test("routes global chat messages and moderation to the channel's subscribers only", async () => {
    const [local, remote] = await startPair();

    const session = (id: string) => makeAdminSession(id, { platform: "game" });

    const gordion = makeTestSocket(session("remote-gordion"));
    const shared = makeTestSocket(session("remote-shared"));
    const localShared = makeTestSocket(session("local-shared"));
    remote.register(gordion.socket);
    remote.subscribe(gordion.socket, {
      topic: "global.chat.world",
      world: "gordion",
    });
    remote.register(shared.socket);
    remote.subscribe(shared.socket, { topic: "global.chat" });
    local.register(localShared.socket);
    local.subscribe(localShared.socket, { topic: "global.chat" });

    const excluded = [local, remote].flatMap((hub, index) => {
      const recipients = {
        unsubscribed: makeTestSocket(session(`${index}-unsubscribed`)),
        webApp: makeTestSocket(makeAdminSession(`${index}-web-app`)),
        apiKey: makeTestSocket(
          withApiKey(makeAdminSession(`${index}-api-key`), ["organization-1"]),
        ),
        noOrganization: makeTestSocket(
          makeAdminSession(`${index}-former-member`, {
            platform: "game",
            guilds: [],
          }),
        ),
      };

      for (const [role, target] of Object.entries(recipients)) {
        hub.register(target.socket);

        if (role !== "unsubscribed")
          hub.subscribe(target.socket, { topic: "global.chat" });
      }

      return Object.values(recipients);
    });

    const { bridge, deliver } = makeRabbitBridgeHarness(local);

    const sharedMessage = {
      id: "in-shared",
      displayName: "Author",
      message: "Hello",
      timestamp: "2026-10-06T12:00:00.000Z",
      isAdmin: false,
    };

    const inGordion = { ...sharedMessage, id: "in-gordion", world: "gordion" };

    const deliveries: ReadonlyArray<
      readonly [string, string, GlobalChatMessage | GlobalChatChannelUpdate]
    > = [
      [RabbitRoutingKey.GLOBAL_CHAT_SEND_MESSAGE, inGordion.id, inGordion],
      [
        RabbitRoutingKey.GLOBAL_CHAT_SEND_MESSAGE,
        sharedMessage.id,
        sharedMessage,
      ],
      [
        RabbitRoutingKey.GLOBAL_CHAT_CHANNEL_UPDATE,
        "delete",
        { type: "deleted", world: "gordion", id: "in-gordion" },
      ],
      [
        RabbitRoutingKey.GLOBAL_CHAT_CHANNEL_UPDATE,
        "pin",
        { type: "pinned", message: sharedMessage },
      ],
    ];

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          yield* bridge.start();

          for (const [routingKey, messageId, payload] of deliveries)
            yield* deliver(routingKey, payload, { messageId });
        }),
      ),
    );

    const received = (frames: string[]) =>
      frames.map((text) => decodeRealtimeFrame(text));

    expect(received(gordion.sent)).toEqual([
      {
        v: 1,
        type: "global-chat.created",
        data: inGordion,
      },
      {
        v: 1,
        type: "global-chat.deleted",
        data: { world: "gordion", id: "in-gordion" },
      },
    ]);
    expect(received(shared.sent)).toEqual([
      { v: 1, type: "global-chat.created", data: sharedMessage },
      {
        v: 1,
        type: "global-chat.pinned",
        data: { message: sharedMessage },
      },
    ]);
    expect(received(localShared.sent)).toEqual(received(shared.sent));

    for (const target of excluded) expect(target.sent).toHaveLength(0);
  });

  test("routes aura changes to every replica's aura readers only", async () => {
    const [local, remote] = await startPair();

    const reader = (id: string) =>
      makeTestSocket(
        makeAdminSession(id, { platform: "game", characterAuras: true }),
      );

    const localReader = reader("local-reader");
    const remoteReader = reader("remote-reader");
    const unsubscribed = reader("remote-unsubscribed");

    for (const [hub, target] of [
      [local, localReader],
      [remote, remoteReader],
    ] as const) {
      hub.register(target.socket);
      hub.subscribe(target.socket, { topic: "global.character-auras" });
    }

    remote.register(unsubscribed.socket);

    const { bridge, deliver } = makeRabbitBridgeHarness(local);

    const change = {
      auras: [
        { gameAccountId: "101", characterId: "1", auraId: "frost" },
        { gameAccountId: "202", characterId: "2", auraId: null },
      ],
    };

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          yield* bridge.start();
          yield* deliver(RabbitRoutingKey.CHARACTER_AURAS_CHANGED, change, {
            messageId: "aura-change",
          });
        }),
      ),
    );

    for (const target of [localReader, remoteReader])
      expect(target.sent.map((text) => decodeRealtimeFrame(text))).toEqual([
        { v: 1, type: "character-auras.changed", data: change },
      ]);
    expect(unsubscribed.sent).toHaveLength(0);
  });

  test("closes on the first dropped event and never resumes a session with a delivery gap", async () => {
    const {
      hubs: [hub],
    } = await startHubs(1, { maxBackpressureBytes: 1 });

    if (!hub) throw new Error("Missing hub");

    const scope = {
      topic: "organization.chat",
      organizationId: "organization-1",
    } as const;

    const target = makeTestSocket(makeAdminSession("slow"), 10);
    let bufferedAmount = 10;
    target.socket.getBufferedAmount = () => bufferedAmount;

    const healthy = makeTestSocket(makeAdminSession("healthy"));

    for (const recipient of [target, healthy]) {
      hub.register(recipient.socket);
      hub.subscribe(recipient.socket, scope);
    }

    const event = {
      v: 1,
      type: "chat.cleared",
      data: { organizationId: "organization-1", payload: {} },
    } as const;

    await hub.publishToScope(scope, event);
    expect(target.closes).toEqual([1013]);
    expect(healthy.sent).toEqual([JSON.stringify(event)]);
    bufferedAmount = 0;
    await hub.publishToScope(scope, event);
    await hub.publishToScope(scope, event);
    expect(target.sent).toHaveLength(0);
    expect(target.closes).toEqual([1013]);
    expect(healthy.sent).toHaveLength(3);
    expect(healthy.closes).toEqual([]);
  });

  test("skips federation decoding without a local audience and validates frames once recipients subscribe", async () => {
    const {
      hubs: [hub],
      bus: { store: redis },
    } = await startHubs(1);

    if (!hub) throw new Error("Missing hub");
    const target = makeTestSocket(makeAdminSession("target"));
    hub.register(target.socket);

    const scope = {
      topic: "organization.chat",
      organizationId: "organization-1",
    } as const;

    const event = {
      v: 1,
      type: "chat.cleared",
      data: { organizationId: scope.organizationId, payload: {} },
    } as const;

    const message = {
      id: "no-audience",
      sourceInstanceId: "remote",
      scope,
    };

    const frames = { event: JSON.stringify(event) };
    const decodeFrame = spyOn(realtimeCodec, "tryDecodeRealtimeFrameValue");

    try {
      await redis.publish(message, frames);
      expect(decodeFrame).not.toHaveBeenCalled();
      expect(target.sent).toEqual([]);
      hub.subscribe(target.socket, scope);
      await redis.publish(message, frames);
      expect(target.sent).toEqual([]);
      await redis.publish({ ...message, id: "subscribed" }, frames);
      expect(decodeFrame).toHaveBeenCalledTimes(1);
      expect(target.sent.map(decodeRealtimeFrame)).toEqual([event]);
      await redis.publish(
        { ...message, id: "malformed" },
        { event: JSON.stringify({ v: 1 }) },
      );
      expect(target.sent).toHaveLength(1);
    } finally {
      decodeFrame.mockRestore();
    }
  });

  test("accepts queued frames but closes a session when Bun drops a frame below the buffer threshold", () => {
    const hub = new RealtimeHub(hubConfig, unusedFederationStore);
    const target = makeTestSocket(makeAdminSession("transport-backpressure"));
    const texts: string[] = [];
    let result = -1;

    target.socket.send = (text) => {
      texts.push(text);

      return result;
    };

    const event = {
      v: 1,
      type: "chat.created",
      data: { organizationId: "organization-1", payload: { id: "message-1" } },
    } as const;

    expect(hub.sendEvent(target.socket, event)).toBe(true);
    expect(texts).toEqual([JSON.stringify(event)]);
    expect(target.closes).toEqual([]);
    result = 0;
    expect(hub.sendEvent(target.socket, event)).toBe(false);
    expect(target.closes).toEqual([1013]);
    result = 100;
    expect(hub.sendEvent(target.socket, event)).toBe(false);
    expect(target.closes).toEqual([1013]);
  });
});
