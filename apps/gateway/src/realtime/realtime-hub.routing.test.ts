import * as realtimeCodec from "@lootlog/protocol/realtime/codec";
import { makeRabbitBridgeHarness } from "../../test/rabbit-fixtures.js";
import {
  makeTestSocket,
  startHubs,
  startPair,
  makeAdminSession,
} from "../../test/realtime-fixtures.js";
import { Permission } from "@lootlog/schema/permissions";
import { describe, expect, test } from "bun:test";
import { decodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect } from "effect";
import type { FederatedRealtimeMessage } from "#src/platform/redis-store";

describe("RealtimeHub federation", () => {
  test.each(["scope", "scopes", "user", "discord", "presence"] as const)(
    "sends canonical local and remote frames through %s publication and rejects malformed federation",
    async (publication) => {
      const [local, remote, { store }] = await startPair();

      const scope = {
        topic: "organization.chat",
        organizationId: "organization-1",
      } as const;

      const targets = [local, remote].map((hub, index) => {
        const identity = {
          userId: "canonical-user",
          discordId: "canonical-discord",
        };

        const target = makeTestSocket({
          ...makeAdminSession(`canonical-${index}`),
          ...identity,
        });

        hub.register(target.socket);
        hub.subscribe(target.socket, scope);

        return target.sent;
      });

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

      const preciseCanonical = {
        ...canonical,
        data: { ...canonical.data, payload: { id: "message-precise" } },
      };

      const preciseWithUnknownFields = {
        ...preciseCanonical,
        untrusted: "strip",
        data: { ...preciseCanonical.data, untrusted: "strip" },
      };

      switch (publication) {
        case "scope":
          await local.publishToScope(scope, withUnknownFields);
          break;
        case "scopes":
          await local.publishToScopes([scope, scope], withUnknownFields);
          break;
        case "user":
          await local.publishToUser("canonical-user", withUnknownFields);
          break;
        case "discord":
          await local.publishToDiscord("canonical-discord", withUnknownFields);
          break;
        case "presence":
          await local.publishPresence(
            scope,
            withUnknownFields,
            preciseWithUnknownFields,
          );
          break;
      }

      await store.publish(
        {
          id: "raw-federation",
          sourceInstanceId: "external-instance",
          scope,
        },
        { event: JSON.stringify(withUnknownFields) },
      );

      for (const sent of targets) {
        expect(sent.map((text) => JSON.parse(text))).toEqual([
          publication === "presence" ? preciseCanonical : canonical,
          canonical,
        ]);
      }

      for (const [index, event] of [
        JSON.stringify({ ...canonical, v: 2 }),
        JSON.stringify({ ...canonical, type: "unsupported.event" }),
        JSON.stringify({ ...canonical, data: { payload: {} } }),
        JSON.stringify({
          v: 1,
          type: "session.join",
          requestId: "valid-command",
          data: { platform: "web-app" },
        }),
        JSON.stringify({ v: 1, type: "session.join", data: {} }),
      ].entries()) {
        await store.publish(
          {
            id: `malformed-federation-${index}`,
            sourceInstanceId: "external-instance",
            scope,
          },
          { event },
        );
      }

      for (const sent of targets) expect(sent).toHaveLength(2);
    },
  );

  test("strips fields of another schema and forwards canonical frames from other replicas without validating them", async () => {
    const [local, remote, bus] = await startPair();

    const scope = {
      topic: "organization.chat",
      organizationId: "organization-1",
    } as const;

    const target = makeTestSocket(makeAdminSession("federated"));
    remote.register(target.socket);
    remote.subscribe(target.socket, scope);

    const published: FederatedRealtimeMessage[] = [];
    bus.listeners.push((message) => published.push(message));

    const event = {
      v: 1,
      type: "chat.cleared",
      data: { organizationId: scope.organizationId, payload: { id: "a" } },
    } as const;

    await local.publishToScope(scope, event);
    const message = published[0];

    if (!message) throw new Error("Missing federation message");
    expect(message.event).toEqual(event);

    const canonicalText = JSON.stringify({
      data: event.data,
      type: event.type,
      v: event.v,
    });

    for (const [id, frameSchema, text] of [
      ["canonical-schema", message.frameSchema, canonicalText],
      [
        "other-schema",
        "other",
        JSON.stringify({ ...event, data: { ...event.data, unknown: "strip" } }),
      ],
    ] as const) {
      for (const listener of bus.listeners)
        listener({
          ...message,
          id,
          sourceInstanceId: "other-replica",
          frameSchema,
          event: JSON.parse(text),
        });
    }

    const [canonical, other] = target.sent.slice(-2);
    expect(canonical).toBe(canonicalText);
    expect(JSON.parse(other ?? "")).toEqual(event);
  });

  test("keeps JSON normalization and rejected payload keys aligned locally and remotely", async () => {
    const [local, remote] = await startPair();

    const scope = {
      topic: "organization.chat",
      organizationId: "organization-1",
    } as const;

    const targets = [local, remote].map((hub, index) => {
      const target = makeTestSocket(makeAdminSession(`normalized-${index}`));
      hub.register(target.socket);
      hub.subscribe(target.socket, scope);

      return target.sent;
    });

    const customPayload = Object.defineProperty({ id: "message" }, "toJSON", {
      value: () => ({ id: "custom" }),
    });

    const sparse: unknown[] = ["value"];
    sparse.length = 3;

    const customIterable = Object.defineProperty([1], Symbol.iterator, {
      value: function* () {
        yield 2;
      },
    });

    for (const payload of [
      { bytes: new Uint16Array([256, 257]) },
      { bytes: Buffer.from([1, 2, 3]) },
      { list: customIterable },
      {
        optional: undefined,
        list: [undefined],
        sparse,
        date: new Date(1000),
      },
      { text: "x".repeat(100) + "\ud800", value: -0 },
      customPayload,
      {
        get value() {
          return "accessor";
        },
      },
    ]) {
      const event = {
        v: 1,
        type: "chat.cleared",
        data: { organizationId: scope.organizationId, payload },
      } as const;

      await local.publishToScope(scope, event);

      const [localText, remoteText] = targets.map((sent) => sent.at(-1));
      expect(localText).toBe(realtimeCodec.encodeRealtimeFrame(event));
      expect(remoteText).toBe(localText);
    }

    const rejectedPayload: unknown = JSON.parse(
      '{"__proto__":{"hidden":true}}',
    );

    await local.publishToScope(scope, {
      v: 1,
      type: "chat.cleared",
      data: { organizationId: scope.organizationId, payload: rejectedPayload },
    });

    for (const sent of targets) expect(sent).toHaveLength(7);
  });

  test("targets every user or Discord connection across gateways without subscriptions", async () => {
    const { hubs } = await startHubs();

    const targets = hubs.map((hub, index) =>
      ["shared", "shared", "other"].map((identity, connection) => {
        const target = makeTestSocket({
          ...makeAdminSession(`identity-${index}-${connection}`),
          userId: `user-${identity}`,
          discordId: `discord-${identity}`,
        });

        hub.register(target.socket);

        return target;
      }),
    );

    const event = {
      v: 1,
      type: "chat.cleared",
      data: { organizationId: "organization-1", payload: {} },
    } as const;

    await hubs[0]?.publishToUser("user-shared", event);
    await hubs[0]?.publishToDiscord("discord-other", event);

    for (const group of targets)
      expect(group.map((target) => target.sent.length)).toEqual([1, 1, 1]);

    for (const [index, hub] of hubs.entries()) {
      const target = targets[index]?.[0];

      if (!target) throw new Error("Missing identity target");
      hub.detach(target.socket);
      expect(hub.getLocalSocketsForUser("user-shared")).toHaveLength(1);
    }

    await hubs[0]?.publishToDiscord("discord-shared", event);
    await hubs[0]?.publishToUser("user-other", event);

    for (const group of targets)
      expect(group.map((target) => target.sent.length)).toEqual([1, 2, 2]);
  });

  test("filters kill and loot source visibility before local and remote delivery, preserving retries", async () => {
    const [local, remote, bus] = await startPair();
    const hubs = [local, remote];

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
    ];

    const targets = hubs.map((hub, index) =>
      variants.map((variant) => {
        const session = makeAdminSession(`${index}-${variant.name}`, {
          platform: variant.name === "game" ? "game" : "web-app",
        });

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
        const target = makeTestSocket(session);
        hub.register(target.socket);
        hub.subscribe(target.socket, scope);

        return target;
      }),
    );

    const { bridge, deliver } = makeRabbitBridgeHarness(local);

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

    const deliverKill = () =>
      deliver(RabbitRoutingKey.GUILDS_KILLS_ACCEPTED_V1, payload, {
        messageId: "accepted-kill-1",
        redelivered: true,
      });

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          yield* bridge.start();
          const publish = bus.store.publish;
          bus.store.publish = () =>
            Promise.reject(new Error("Redis unavailable"));

          expect((yield* deliverKill().pipe(Effect.result))._tag).toBe(
            "Failure",
          );
          bus.store.publish = publish;
          yield* deliverKill();
          yield* deliverKill();

          for (const group of targets)
            expect(group.map((target) => target.sent.length)).toEqual([
              2, 0, 0, 0, 2, 2, 0, 0,
            ]);

          for (const group of targets)
            expect(decodeRealtimeFrame(group[0]!.sent[1]!)).toEqual({
              v: 1,
              type: "feed.entry",
              data: feedEntry,
            });
          const { count: _count, ...baseEntry } = feedEntry;

          const lootEntry = {
            ...baseEntry,
            id: "loot:organization-1:1",
            type: "loot" as const,
            lootId: 1,
            items: [],
            additionalItemsCount: 0,
          };

          const loot = {
            id: 1,
            uniqueId: "loot-1",
            world: "tempest",
            source: "FIGHT" as const,
            location: "Map",
            items: [],
            players: [],
            mapPlayersSnapshot: null,
            npcs: [],
            lootShare: {},
            createdAt: "2026-09-06T12:00:00.000Z",
            updatedAt: "2026-09-06T12:00:00.000Z",
            commentsCount: 0,
          };

          const lootPayload = {
            version: 2,
            guildId: "organization-1",
            lootId: 1,
            npcs: [{ type: "HERO", lvl: 100 }],
            feedEntry: lootEntry,
            loot,
          };

          for (let attempt = 0; attempt < 2; attempt++)
            yield* deliver(RabbitRoutingKey.GUILDS_LOOTS_CREATE, lootPayload, {
              messageId: "loot-visible",
              redelivered: true,
            });

          for (const group of targets) {
            expect(group.map((target) => target.sent.length)).toEqual([
              4, 0, 0, 0, 2, 4, 1, 0,
            ]);
            expect(decodeRealtimeFrame(group[0]!.sent[2]!)).toEqual({
              v: 1,
              type: "loot.snapshot",
              data: {
                version: 2,
                guildId: "organization-1",
                lootId: 1,
                npcs: [{ type: "HERO", lvl: 100 }],
                loot,
              },
            });
            expect(decodeRealtimeFrame(group[6]!.sent[0]!)).toEqual({
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
            local.publishToScope(
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
            local.publishToScope(
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
});
