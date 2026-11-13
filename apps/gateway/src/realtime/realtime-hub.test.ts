import * as npcRouting from "@lootlog/domain/npc-routing";
import * as realtimeCodec from "@lootlog/protocol/realtime/codec";
import { makeRabbitBridgeHarness } from "../../test/rabbit-fixtures.js";
import {
  makeFederationBus,
  makeSession,
  makeTestSocket,
  membership,
  startHubs,
  unusedFederationStore,
  withApiKey,
} from "../../test/realtime-fixtures.js";
import { Permission } from "@lootlog/schema/permissions";
import type {
  PartyGatheringSummary,
  PartyGatheringUpdateEnvelope,
  PartyGatheringVolunteer,
} from "@lootlog/schema/party-ready-room";
import { describe, expect, spyOn, test } from "bun:test";
import { decodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import type {
  GlobalChatChannelUpdate,
  GlobalChatMessage,
} from "@lootlog/schema/chat";
import { Effect } from "effect";
import type { FederatedRealtimeMessage } from "#src/platform/redis-store";
import { getScopeKey } from "./realtime-audiences.js";
import { RealtimeHub } from "./realtime-hub.js";
import type { SessionData } from "./session.js";
import { SubscriptionLimitExceeded } from "./realtime-errors.js";
import { canSubscribe } from "./subscription-policy.js";

const config = {
  maxBackpressureBytes: 1_024,
};

/** An unstarted hub whose federation publishes go nowhere. */
const makeHub = () => new RealtimeHub(config, makeFederationBus().store);

/** Two started replicas sharing one federation bus. */
const startPair = async () => {
  const { hubs, bus } = await startHubs();
  const [local, remote] = hubs;

  if (!local || !remote) throw new Error("Missing federated hubs");

  return [local, remote, bus] as const;
};

/** A web session that owns and administers both Lootlogs. */
const makeAdminSession = (
  connectionId: string,
  overrides: Partial<SessionData> = {},
): SessionData => {
  const discordId = `discord-${connectionId}`;

  return makeSession({
    discordId,
    userId: `user-${connectionId}`,
    connectionId,
    guilds: ["organization-1", "organization-2"].map((id) =>
      membership(id, [Permission.ADMIN], {
        ownerId: discordId,
        roleId: "admin",
      }),
    ),
    ...overrides,
  });
};

const makeGamePresence = (
  session: SessionData,
  world = "tempest",
  mapId = 1,
  {
    characterId = "123",
    organizationIds = session.guilds.map(({ guild }) => guild.id),
  }: {
    readonly characterId?: string;
    readonly organizationIds?: string[];
  } = {},
): NonNullable<SessionData["presence"]> => ({
  userId: session.userId,
  sessionId: session.connectionId,
  organizationIds,
  platform: "game",
  status: "online",
  confidence: "reported",
  isAfk: false,
  lastSeen: 1,
  character: {
    world,
    name: "Player",
    lvl: 200,
    characterId,
    accountId: "456",
    prof: "w",
    icon: "icon",
  },
  location: { mapId, map: `Map ${mapId}` },
});

describe("RealtimeHub federation", () => {
  test.each([
    ["organization.chat", "chat.cleared"],
    ["organization.reservations", "reservation.created"],
    ["organization.notifications", "party-gathering.updated"],
    ["event.coordination", "event.ranking-updated"],
  ] as const)(
    "rechecks %s grants for stale audiences on every instance",
    async (topic, type) => {
      const [local, remote] = await startPair();
      const scope = { topic, organizationId: "organization-1" };

      const targets = [local, remote].map((hub, index) => {
        const target = makeTestSocket(makeAdminSession(`revoked-${index}`));
        hub.register(target.socket);
        hub.subscribe(target.socket, scope);

        return target;
      });

      const event = {
        v: 1,
        type,
        data: { organizationId: scope.organizationId, payload: {} },
      } as const;

      await local.publishToScope(scope, event);

      for (const target of targets) {
        expect(target.sent).toHaveLength(1);
        target.socket.data.guilds = [
          { guild: { id: scope.organizationId, ownerId: "owner" }, roles: [] },
        ];
      }

      await local.publishToScope(scope, event);

      for (const target of targets) {
        expect(target.socket.data.subscriptions.size).toBe(1);
        expect(target.sent).toHaveLength(1);
      }
    },
  );

  test("delivers kill-stats.changed only to the user's clients that joined with the feature, on every replica", async () => {
    const [local, remote] = await startPair();

    const variants = [
      { name: "web-app", platform: "web-app", killStats: true },
      { name: "older web-app", platform: "web-app", killStats: false },
      { name: "game", platform: "game", killStats: true },
    ] as const;

    const targets = [local, remote].flatMap((hub, index) =>
      variants.map(({ name, platform, killStats }) => {
        const target = makeTestSocket({
          ...makeAdminSession(`${name}-${index}`, { platform, killStats }),
          userId: "shared-user",
        });

        hub.register(target.socket);

        return { name, target };
      }),
    );

    await local.publishToUser("shared-user", {
      v: 1,
      type: "kill-stats.changed",
      data: {},
    });

    // A client that does not know the event type rejects it and disconnects.
    expect(
      targets.map(({ name, target }) => [name, target.sent.length]),
    ).toEqual([
      ["web-app", 1],
      ["older web-app", 0],
      ["game", 0],
      ["web-app", 1],
      ["older web-app", 0],
      ["game", 0],
    ]);
  });

  test("blocks revoked Organization payloads on direct user, Discord and snapshot delivery", async () => {
    const [local, remote] = await startPair();

    const targets = [local, remote].map((hub, index) => {
      const target = makeTestSocket({
        ...makeAdminSession(`direct-${index}`),
        userId: "shared-user",
        discordId: "shared-discord",
      });

      hub.register(target.socket);

      return target;
    });

    const event = {
      v: 1,
      type: "reservation.created",
      data: { organizationId: "organization-1", payload: {} },
    } as const;

    const sharedReservation = {
      v: 1,
      type: "reservation.changed",
      data: {
        version: 2,
        action: "updated",
        sourceGuildId: "shared-source",
        audienceGuildIds: ["organization-1"],
        reservationId: 1,
        spotId: null,
      },
    } as const;

    await local.publishToUser("shared-user", event);
    await local.publishToDiscord("shared-discord", event);
    await local.publishToUser("shared-user", sharedReservation);
    await local.publishToDiscord("shared-discord", sharedReservation);

    for (const target of targets) {
      expect(target.sent).toHaveLength(4);
      target.socket.data.guilds = [];
    }

    await local.publishToUser("shared-user", event);
    await local.publishToDiscord("shared-discord", event);
    await local.publishToUser("shared-user", sharedReservation);
    await local.publishToDiscord("shared-discord", sharedReservation);

    for (const [index, hub] of [local, remote].entries()) {
      const target = targets[index];

      if (!target) throw new Error("Missing direct recipient");
      expect(
        hub.sendEvent(target.socket, {
          v: 1,
          type: "presence.snapshot",
          data: {
            organizationId: "organization-1",
            revision: 1,
            presences: [],
          },
        }),
      ).toBe(false);
      expect(target.sent).toHaveLength(4);
    }
  });

  test.each([false, true])(
    "delivers shared map pings only through an authorized matching Organization with location filtering: %s",
    async (filterLocation) => {
      const [local, remote] = await startPair();

      const scopes = ["organization-1", "organization-2"].map(
        (organizationId) => ({ topic: "map.pings", organizationId }) as const,
      );

      const scenarios = [
        { id: "first", subscribed: [0], allowed: [0], delivered: true },
        { id: "second", subscribed: [1], allowed: [1], delivered: true },
        { id: "both", subscribed: [0, 1], allowed: [0, 1], delivered: true },
        { id: "revoked", subscribed: [0, 1], allowed: [], delivered: false },
        { id: "wrong-scope", subscribed: [0], allowed: [1], delivered: false },
        {
          id: "unsubscribed",
          subscribed: [],
          allowed: [0, 1],
          delivered: false,
        },
        {
          id: "web",
          subscribed: [0, 1],
          allowed: [0, 1],
          delivered: !filterLocation,
        },
        {
          id: "other-world",
          subscribed: [0, 1],
          allowed: [0, 1],
          delivered: !filterLocation,
        },
        {
          id: "other-map",
          subscribed: [0, 1],
          allowed: [0, 1],
          delivered: !filterLocation,
        },
        {
          id: "limited-key",
          subscribed: [0, 1],
          allowed: [0, 1],
          keyScope: [0],
          delivered: false,
        },
        {
          id: "shared-key",
          subscribed: [0, 1],
          allowed: [0, 1],
          keyScope: [0, 1],
          delivered: true,
        },
      ];

      const targets = [local, remote].flatMap((hub, index) =>
        scenarios.map((scenario) => {
          const session: SessionData = {
            ...makeAdminSession(`ping-${index}-${scenario.id}`),
            platform: scenario.id === "web" ? "web-app" : "game",
          };

          session.presence = makeGamePresence(
            session,
            scenario.id === "other-world" ? "other-world" : "tempest",
            scenario.id === "other-map" ? 2 : 1,
          );
          const target = makeTestSocket(session);
          target.socket.data.guilds = target.socket.data.guilds.filter(
            (_, guildIndex) => scenario.allowed.includes(guildIndex),
          );

          if (scenario.keyScope)
            withApiKey(
              target.socket.data,
              scenario.keyScope.map(
                (guildIndex) => `organization-${guildIndex + 1}`,
              ),
              { keyId: scenario.id },
            );

          hub.register(target.socket);

          for (const scopeIndex of scenario.subscribed) {
            const scope = scopes[scopeIndex];

            if (!scope) throw new Error("Missing ping scope");
            hub.subscribe(target.socket, scope);
          }

          return { ...target, delivered: scenario.delivered };
        }),
      );

      const ping = {
        v: 1,
        type: "map-ping.received",
        data: {
          pingId: "ping",
          world: "tempest",
          mapId: 1,
          type: "attention",
          x: 10,
          y: 20,
          sender: { characterId: "character", name: "Player" },
          createdAt: 1,
        },
      } as const;

      await local.publishToScopes(
        scopes,
        ping,
        filterLocation
          ? {
              recipientPlatform: "game",
              recipientWorld: "tempest",
              recipientMapId: 1,
            }
          : {},
      );

      for (const target of targets) {
        await local.publishToUser(target.socket.data.userId, ping);
        expect(local.sendEvent(target.socket, ping)).toBe(false);
        expect(target.sent).toHaveLength(target.delivered ? 1 : 0);
      }
    },
  );

  test.each(["wildcard", "exact"] as const)(
    "keeps %s map-ping recipients current through presence, access and connection changes on both gateways",
    async (subscription) => {
      const [local, remote] = await startPair();
      const organizationIds = ["organization-1", "organization-2"];

      const targets = [local, remote].map((hub, index) => {
        const session: SessionData = {
          ...makeAdminSession(`ping-lifecycle-${index}`),
          platform: "game",
        };

        const target = makeTestSocket(session);
        hub.setPresence(target.socket, makeGamePresence(session));
        hub.register(target.socket);

        return { hub, target };
      });

      const subscribeAt = (world: string, mapId: number) => {
        for (const { hub, target } of targets) {
          hub.replaceSubscriptions(
            target.socket,
            organizationIds.map((organizationId) => {
              const scope = { topic: "map.pings", organizationId } as const;

              return subscription === "exact"
                ? { ...scope, world, mapId }
                : scope;
            }),
          );
        }
      };

      const publish = async (
        world: string,
        mapId: number,
        expected: boolean,
        excludeConnectionId?: string,
      ) => {
        const before = targets.map(({ target }) => target.sent.length);
        await local.publishToScopes(
          organizationIds.map((organizationId) => ({
            topic: "map.pings",
            organizationId,
            world,
            mapId,
          })),
          {
            v: 1,
            type: "map-ping.received",
            data: {
              pingId: crypto.randomUUID(),
              world,
              mapId,
              type: "attention",
              x: 10,
              y: 20,
              sender: { characterId: "123", name: "Player" },
              createdAt: 1,
            },
          },
          {
            recipientPlatform: "game",
            recipientWorld: world,
            recipientMapId: mapId,
            excludeConnectionId,
          },
        );

        for (const [index, { target }] of targets.entries()) {
          const delivered =
            expected && target.socket.data.connectionId !== excludeConnectionId;

          expect(target.sent.length - (before[index] ?? 0)).toBe(
            delivered ? 1 : 0,
          );
        }
      };

      subscribeAt("tempest", 1);
      await publish("tempest", 1, true);
      await publish(
        "tempest",
        1,
        true,
        targets[0]?.target.socket.data.connectionId,
      );

      for (const { hub, target } of targets)
        hub.setPresence(
          target.socket,
          makeGamePresence(target.socket.data, "tempest", 2),
        );
      await publish("tempest", 1, false);
      await publish("tempest", 2, subscription === "wildcard");
      subscribeAt("tempest", 2);
      await publish("tempest", 2, true);

      for (const { hub, target } of targets)
        hub.setPresence(
          target.socket,
          makeGamePresence(target.socket.data, "other-world", 2),
        );
      await publish("tempest", 2, false);
      subscribeAt("other-world", 2);
      await publish("other-world", 2, true);

      for (const missing of ["location", "character", "presence"] as const) {
        for (const { hub, target } of targets) {
          const presence = makeGamePresence(
            target.socket.data,
            "other-world",
            2,
          );

          hub.setPresence(
            target.socket,
            missing === "presence"
              ? undefined
              : { ...presence, [missing]: undefined },
          );
        }

        await publish("other-world", 2, false);

        for (const { hub, target } of targets)
          hub.setPresence(
            target.socket,
            makeGamePresence(target.socket.data, "other-world", 2),
          );
        await publish("other-world", 2, true);
      }

      for (const { target } of targets) target.socket.data.guilds = [];
      await publish("other-world", 2, false);

      for (const { hub, target } of targets) {
        target.socket.data.guilds = makeAdminSession(
          target.socket.data.connectionId,
        ).guilds;
        hub.replaceSubscriptions(target.socket, []);
      }

      await publish("other-world", 2, false);
      subscribeAt("other-world", 2);
      await publish("other-world", 2, true);

      const replaced = targets.map(({ target }) => target);
      const replacedCounts = replaced.map((target) => target.sent.length);

      for (const entry of targets) {
        const previous = entry.target.socket;
        entry.target = makeTestSocket({
          ...previous.data,
          subscriptions: new Map(previous.data.subscriptions),
          presence: makeGamePresence(previous.data, "other-world", 3),
        });
        entry.hub.register(entry.target.socket);
        entry.hub.detach(previous);
        entry.hub.setPresence(
          previous,
          makeGamePresence(previous.data, "other-world", 2),
        );
      }

      await publish("other-world", 2, false);
      subscribeAt("other-world", 3);
      await publish("other-world", 3, true);
      expect(replaced.map((target) => target.sent.length)).toEqual(
        replacedCounts,
      );

      for (const { hub, target } of targets) {
        hub.reconnectUser(
          target.socket.data.discordId,
          target.socket.data.userId,
        );
        hub.setPresence(
          target.socket,
          makeGamePresence(target.socket.data, "other-world", 3),
        );
      }

      await publish("other-world", 3, false);

      for (const entry of targets) {
        entry.target = makeTestSocket({
          ...entry.target.socket.data,
          connectionId: `${entry.target.socket.data.connectionId}-reconnected`,
        });
        entry.hub.register(entry.target.socket);
      }

      await publish("other-world", 3, true);
    },
  );

  test("delivers loot split choices and filter accepts to listed participants on any map of the world and every instance", async () => {
    const [local, remote] = await startPair();

    const scope = {
      topic: "map.pings",
      organizationId: "organization-1",
      world: "tempest",
    } as const;

    const scenarios = [
      // A participant who walked to another map still sees the split.
      {
        id: "listed",
        characterId: "100",
        mapId: 2,
        organization: "organization-1",
        delivered: true,
      },
      {
        id: "bystander",
        characterId: "200",
        mapId: 1,
        organization: "organization-1",
        delivered: false,
      },
      // A participant from another Lootlog must not learn the choices.
      {
        id: "foreign",
        characterId: "100",
        mapId: 1,
        organization: "organization-2",
        delivered: false,
      },
    ];

    const targets = [local, remote].flatMap((hub, index) =>
      scenarios.map((scenario) => {
        const session = makeAdminSession(`loot-split-${index}-${scenario.id}`, {
          platform: "game",
        });

        session.presence = makeGamePresence(
          session,
          scope.world,
          scenario.mapId,
          {
            characterId: scenario.characterId,
            organizationIds: [scenario.organization],
          },
        );

        const target = makeTestSocket(session);
        hub.register(target.socket);
        hub.subscribe(target.socket, {
          topic: "map.pings",
          organizationId: scenario.organization,
        });

        return { ...target, delivered: scenario.delivered };
      }),
    );

    const sender = { characterId: "300", name: "Sender" };

    const choices = {
      v: 1,
      type: "loot-split.received",
      data: {
        splitId: "1200653658",
        world: scope.world,
        sender,
        choices: { "1200653658": 2 },
        accepted: false,
        sentAt: 1,
      },
    } as const;

    await local.publishToScopes([scope], choices, {
      recipientPlatform: "game",
      recipientWorld: scope.world,
      recipientCharacterIds: ["100"],
    });

    for (const target of targets)
      expect(target.sent).toHaveLength(target.delivered ? 1 : 0);

    const autoAccepted = {
      v: 1,
      type: "loot-split.auto-accepted",
      data: { world: scope.world, sender, sentAt: 1 },
    } as const;

    await local.publishToScopes([scope], autoAccepted, {
      recipientPlatform: "game",
      recipientWorld: scope.world,
      recipientCharacterIds: ["100"],
    });

    for (const target of targets)
      expect(target.sent).toHaveLength(target.delivered ? 2 : 0);

    const battlePing = {
      v: 1,
      type: "battle-ping.received",
      data: {
        pingId: "ping",
        world: scope.world,
        mapId: 1,
        type: "attack",
        warriorId: -5,
        sender,
        createdAt: 1,
      },
    } as const;

    // Without a routing scope a ping has no Organization to authorize it.
    for (const event of [choices, autoAccepted, battlePing])
      for (const target of targets) {
        await local.publishToUser(target.socket.data.userId, event);
        expect(local.sendEvent(target.socket, event)).toBe(false);
        expect(target.sent).toHaveLength(target.delivered ? 2 : 0);
      }
  });

  test("filters hero events from RabbitMQ on local and federated connections after role changes", async () => {
    const [local, remote] = await startPair();

    const scope = {
      topic: "event.coordination",
      organizationId: "organization-1",
    } as const;

    const targets = [local, remote].flatMap((hub, index) =>
      [false, true].map((visible) => {
        const session = makeAdminSession(`${index}-${visible}`, {
          guilds: [
            membership(scope.organizationId, [Permission.LOOTLOG_EVENTS_READ], {
              roleId: "role",
              lvlRangeFrom: 1,
              lvlRangeTo: visible ? 500 : 100,
            }),
          ],
        });

        const target = makeTestSocket(session);
        hub.register(target.socket);
        hub.subscribe(target.socket, scope);

        return { ...target, visible };
      }),
    );

    const { bridge, deliver } = makeRabbitBridgeHarness(local);

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          yield* bridge.start();

          for (const routingKey of [
            RabbitRoutingKey.EVENT_MAP_STATUS_UPDATE,
            RabbitRoutingKey.EVENT_HERO_KILLED,
            RabbitRoutingKey.EVENT_RESPAWN_WINDOW_OPENED,
            RabbitRoutingKey.EVENT_RESPAWN_WINDOW_CLOSED,
          ])
            yield* deliver(
              routingKey,
              {
                guildId: scope.organizationId,
                eventId: "event",
                heroId: "hidden-hero",
                mapId: "hidden-map",
                heroNpcLvl: 300,
              },
              { messageId: routingKey },
            );

          for (const target of targets)
            expect(target.sent).toHaveLength(target.visible ? 4 : 0);

          // Delivery must use current roles even when old subscription objects remain.
          for (const target of targets)
            target.socket.data.guilds = target.socket.data.guilds.map(
              (guild) => ({
                ...guild,
                roles: guild.roles.map((role) => ({
                  ...role,
                  lvlRangeTo: 100,
                })),
              }),
            );
          yield* Effect.tryPromise(() =>
            local.publishToScope(scope, {
              v: 1,
              type: "event.respawn-window-opened",
              data: {
                organizationId: scope.organizationId,
                payload: { guildId: scope.organizationId, heroNpcLvl: 300 },
              },
            }),
          );

          for (const target of targets)
            expect(target.sent).toHaveLength(target.visible ? 4 : 0);
        }),
      ),
    );
  });

  test("bounds retained subscriptions, permits replacement at capacity and reclaims capacity", async () => {
    const hub = makeHub();

    const target = makeTestSocket(makeAdminSession("bounded"));
    hub.register(target.socket);

    const scope = {
      topic: "organization.chat",
      organizationId: "organization-1",
    } as const;

    for (let index = 0; index < 4_096; index += 1)
      hub.subscribe(target.socket, { ...scope, eventId: String(index) });
    expect(() =>
      hub.subscribe(target.socket, { ...scope, eventId: "excess" }),
    ).toThrow(SubscriptionLimitExceeded);
    expect(target.socket.data.subscriptions.size).toBe(4_096);
    hub.subscribe(target.socket, { ...scope, eventId: "0" });
    expect(target.socket.data.subscriptions.size).toBe(4_096);
    await hub.publishToScope(
      { ...scope, eventId: "excess" },
      {
        v: 1,
        type: "chat.cleared",
        data: { organizationId: scope.organizationId, payload: {} },
      },
    );
    expect(target.sent).toHaveLength(0);
    hub.unsubscribe(target.socket, { ...scope, eventId: "0" });
    hub.subscribe(target.socket, { ...scope, eventId: "excess" });
    await hub.publishToScope(
      { ...scope, eventId: "excess" },
      {
        v: 1,
        type: "chat.cleared",
        data: { organizationId: scope.organizationId, payload: {} },
      },
    );
    expect(target.sent).toHaveLength(1);
    hub.replaceSubscriptions(
      target.socket,
      Array.from({ length: 5_000 }, () => scope),
    );
    expect(target.socket.data.subscriptions.size).toBe(1);
  });

  test("rejects oversized UTF-8 scopes and clears revoked audiences when replacement exceeds the budget", async () => {
    const hub = makeHub();

    const target = makeTestSocket(makeAdminSession("oversized"));
    hub.register(target.socket);

    const scope = {
      topic: "organization.chat",
      organizationId: "organization-1",
    } as const;

    hub.subscribe(target.socket, scope);
    expect(() =>
      hub.subscribe(target.socket, { ...scope, world: "ą".repeat(512) }),
    ).toThrow(SubscriptionLimitExceeded);
    expect(target.socket.data.subscriptions.size).toBe(1);
    expect(() =>
      hub.replaceSubscriptions(target.socket, [
        scope,
        { ...scope, eventId: "a".repeat(1_024) },
      ]),
    ).toThrow(SubscriptionLimitExceeded);
    expect(target.socket.data.subscriptions.size).toBe(0);
    expect(target.closes).toEqual([1008]);
    await hub.publishToScope(scope, {
      v: 1,
      type: "chat.cleared",
      data: { organizationId: scope.organizationId, payload: {} },
    });
    expect(target.sent).toHaveLength(0);
  });

  test("keeps local and federated delivery aligned through subscription changes and disconnect", async () => {
    const { hubs } = await startHubs();

    const scope = {
      topic: "organization.chat",
      organizationId: "organization-1",
    } as const;

    const otherScope = { ...scope, organizationId: "organization-2" };

    const targets = hubs.map((hub, index) => {
      const target = makeTestSocket(makeAdminSession(`lifecycle-${index}`));
      target.socket.data.subscriptions.set(getScopeKey(scope), scope);
      hub.register(target.socket);

      return target;
    });

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

    for (const [index, hub] of hubs.entries()) {
      const target = targets[index];

      if (!target) throw new Error("Missing lifecycle target");
      hub.detach(target.socket);
      // An asynchronous subscription request may finish after the socket closes.
      hub.subscribe(target.socket, otherScope);
    }

    await publish("organization-2");
    expect(counts()).toEqual([2, 2]);
  });

  test("matches every optional scope dimension and delivers overlapping scopes only once", async () => {
    const hub = makeHub();

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
      const target = makeTestSocket(makeAdminSession(`dimension-${index}`));
      hub.register(target.socket);
      hub.subscribe(target.socket, subscription);

      return target;
    });

    const overlapping = makeTestSocket(makeAdminSession("overlapping"));
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

  test("keeps scopes whose fields contain the delimiter distinct and removes only the unsubscribed one", async () => {
    const hub = makeHub();

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

    const firstTarget = makeTestSocket(makeAdminSession("literal-first"));
    const secondTarget = makeTestSocket(makeAdminSession("literal-second"));
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
    // A second subscription whose fields join to the same text is its own scope.
    hub.subscribe(firstTarget.socket, second);
    expect(firstTarget.socket.data.subscriptions.size).toBe(2);
    await hub.publishToScope(first, event);
    expect(firstTarget.sent).toHaveLength(2);
    hub.unsubscribe(firstTarget.socket, second);
    await hub.publishToScope(second, event);
    expect(firstTarget.sent).toHaveLength(2);
    await hub.publishToScope(first, event);
    expect(firstTarget.sent).toHaveLength(3);
    hub.subscribe(firstTarget.socket, wildcard);
    hub.unsubscribe(firstTarget.socket, first);
    await hub.publishToScopes([first, second], event);
    expect(firstTarget.sent).toHaveLength(4);
  });

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

      // Administrators read precise presence, so they receive this variant.
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
        // Parse the wire text without the protocol schema, which would hide leaked fields.
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

    // A replica with this schema already encoded the frame, in its own key order.
    const canonicalText = JSON.stringify({
      data: event.data,
      type: event.type,
      v: event.v,
    });

    // A replica with another schema may send fields this one strips.
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

    // The decoder rejects this key even inside otherwise valid JSON payloads.
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
            // The Web app receives the loot only through `loot.snapshot`.
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

  test("deduplicates outbox replays across gateways without losing a failed federation publish", async () => {
    const [first, second, bus] = await startPair();

    const targets = [first, second].map((hub, index) => {
      // The Game client reads new loots as `loot.created`.
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
          expect(frames()).toEqual([[event()], []]);

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

    // Only Members in the Game client may read global chat, even when subscribed.
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
        { gameAccountId: "101", auraId: "frost" },
        { gameAccountId: "202", auraId: null },
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

    // Registered after the slow socket, so an aborted broadcast would skip it.
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
      // Already observed publications must not be replayed after joining.
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
    const hub = new RealtimeHub(config, unusedFederationStore);
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

test("gathering rosters reach authorized observers across gateways without exposing hidden sources or legacy clients", async () => {
  const [local, remote] = await startPair();
  const sourceGuild = "organization-1";
  const sharedGuild = "organization-2";

  const readPermissions = [
    Permission.LOOTLOG_CHAT_READ,
    Permission.LOOTLOG_CHAT_HEROES_READ,
  ];

  const scenarios: Array<{
    name: string;
    allowed: boolean;
    permissions?: Permission[];
    minimumLevel?: number;
    organizations?: string[];
    organizer?: boolean;
    owner?: boolean;
    apiKey?: boolean;
    world?: string;
  }> = [
    { name: "observer", allowed: true },
    {
      name: "shared-observer",
      allowed: true,
      organizations: [sourceGuild, sharedGuild],
    },
    {
      name: "organizer",
      allowed: true,
      organizer: true,
      permissions: [
        Permission.LOOTLOG_CHAT_READ,
        Permission.LOOTLOG_NOTIFICATIONS_SEND,
      ],
    },
    {
      name: "sender-only-organizer",
      allowed: true,
      organizer: true,
      permissions: [Permission.LOOTLOG_NOTIFICATIONS_SEND],
    },
    {
      name: "revoked-organizer",
      allowed: false,
      organizer: true,
      permissions: [],
    },
    {
      name: "api-key-organizer",
      allowed: false,
      organizer: true,
      apiKey: true,
      permissions: [Permission.LOOTLOG_NOTIFICATIONS_SEND],
    },
    { name: "owner", allowed: true, owner: true, permissions: [] },
    { name: "administrator", allowed: true, permissions: [Permission.ADMIN] },
    {
      name: "hidden-tier",
      allowed: false,
      permissions: [Permission.LOOTLOG_CHAT_READ],
    },
    { name: "hidden-level", allowed: false, minimumLevel: 200 },
    {
      name: "other-organization",
      allowed: false,
      organizations: [sharedGuild],
    },
    { name: "other-world-subscription", allowed: false, world: "classic" },
    { name: "api-key", allowed: false, apiKey: true },
  ];

  const targets = [local, remote].flatMap((hub, index) =>
    scenarios.map((scenario) => {
      const connectionId = `${index}-${scenario.name}`;

      const discordId = scenario.organizer
        ? "organizer"
        : `discord-${connectionId}`;

      const organizations = scenario.organizations ?? [sourceGuild];

      const session = makeAdminSession(connectionId, {
        platform: "game",
        discordId,
        guilds: organizations.map((id) =>
          membership(id, scenario.permissions ?? readPermissions, {
            ownerId: scenario.owner ? discordId : "different-owner",
            roleId: "reader",
            lvlRangeFrom: scenario.minimumLevel ?? 0,
          }),
        ),
      });

      if (scenario.apiKey)
        withApiKey(session, organizations, {
          keyId: "key",
          personalData: true,
        });

      const target = makeTestSocket(session);
      hub.register(target.socket);

      for (const organizationId of organizations) {
        const scope = {
          topic: "organization.chat",
          organizationId,
          world: scenario.world,
        } as const;

        if (canSubscribe(session, scope)) hub.subscribe(target.socket, scope);
      }

      return { ...target, scenario };
    }),
  );

  const harness = makeRabbitBridgeHarness(local);

  const volunteer: PartyGatheringVolunteer = {
    characterId: "volunteer",
    nick: "Chętny",
    icon: "player.gif",
    lvl: 110,
    prof: "w",
    partyPresence: "OUTSIDE",
  };

  const partyMember = {
    characterId: "member",
    nick: "W grupie",
    icon: "member.gif",
    lvl: 115,
    prof: "m",
  };

  const privateVolunteer = {
    ...volunteer,
    discordId: "private-volunteer",
    accountId: "private-account",
  };

  const gathering = {
    notificationId: "gathering",
    organizerName: "Organizator",
    organizerDiscordId: "organizer",
    world: "tempest",
    revision: 1,
    guildIds: [sourceGuild, sharedGuild],
    npc: { name: "Hero", location: "Map", lvl: 105, type: "HERO" },
    createdAt: "2026-09-28T10:00:00Z",
    expiresAt: "2026-09-28T11:00:00Z",
    applicantCount: 1,
    inPartyCount: 0,
    partyMemberCount: 1,
    volunteers: [privateVolunteer],
    partyState: {
      status: "OBSERVED",
      observedAt: "2026-09-28T10:01:00Z",
      members: [partyMember],
    },
  } satisfies PartyGatheringSummary;

  const envelope: PartyGatheringUpdateEnvelope = {
    guildId: sourceGuild,
    guildIds: gathering.guildIds,
    world: gathering.world,
    notificationId: gathering.notificationId,
    revision: gathering.revision,
    organizerDiscordId: gathering.organizerDiscordId,
    npc: gathering.npc,
    update: { type: "UPSERT", gathering },
  };

  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* () {
        yield* harness.bridge.start();

        const deliver = (
          payload: PartyGatheringUpdateEnvelope,
          messageId: string,
        ) =>
          harness.deliver(
            RabbitRoutingKey.GUILDS_PARTY_GATHERING_UPDATED,
            payload,
            { messageId },
          );

        yield* deliver(envelope, "gathering-created");
        yield* deliver(envelope, "gathering-created");

        for (const target of targets) {
          expect(target.sent).toHaveLength(target.scenario.allowed ? 1 : 0);

          if (!target.scenario.allowed) continue;
          expect(target.sent.map(decodeRealtimeFrame)).toMatchObject([
            {
              type: "party-gathering.state-updated",
              data: {
                organizationId: sourceGuild,
                payload: {
                  type: "UPSERT",
                  gathering: {
                    organizerDiscordId: "organizer",
                    guildIds: [sourceGuild],
                    volunteers: [volunteer],
                    partyState: { members: [partyMember] },
                  },
                },
              },
            },
          ]);
          expect(
            JSON.stringify(target.sent.map(decodeRealtimeFrame)),
          ).not.toContain("private-");
        }

        yield* deliver(
          { ...envelope, guildId: sharedGuild },
          "gathering-created",
        );

        const sharedTargets = targets.filter(
          (target) => target.scenario.name === "shared-observer",
        );

        for (const target of sharedTargets) {
          expect(target.sent).toHaveLength(2);
          expect(decodeRealtimeFrame(target.sent[1] ?? "")).toMatchObject({
            data: {
              organizationId: sharedGuild,
              payload: { gathering: { guildIds: [sharedGuild] } },
            },
          });
        }

        const departure: PartyGatheringSummary = {
          ...gathering,
          revision: 2,
          partyMemberCount: 0,
          volunteers: [],
          applicantCount: 0,
          partyState: {
            status: "OBSERVED",
            observedAt: "2026-09-28T10:02:00Z",
            members: [],
          },
        };

        yield* deliver(
          {
            ...envelope,
            revision: 2,
            update: { type: "UPSERT", gathering: departure },
          },
          "gathering-departure",
        );
        yield* deliver(
          {
            ...envelope,
            revision: 3,
            update: {
              type: "REMOVE",
              notificationId: "gathering",
              revision: 3,
            },
          },
          "gathering-removed",
        );

        for (const target of targets.filter(
          (target) => target.scenario.allowed,
        )) {
          const frames = target.sent.map(decodeRealtimeFrame);
          expect(frames.slice(-2)).toMatchObject([
            {
              data: {
                payload: {
                  type: "UPSERT",
                  gathering: {
                    revision: 2,
                    applicantCount: 0,
                    volunteers: [],
                    partyMemberCount: 0,
                    partyState: { members: [] },
                  },
                },
              },
            },
            {
              data: {
                payload: {
                  type: "REMOVE",
                  notificationId: "gathering",
                  revision: 3,
                },
              },
            },
          ]);
        }

        for (const target of targets.filter(
          (target) =>
            !target.scenario.allowed &&
            target.scenario.name !== "other-organization",
        ))
          expect(target.sent).toHaveLength(0);

        const mismatched = yield* Effect.exit(
          deliver(
            { ...envelope, guildIds: [sharedGuild] },
            "mismatched-source",
          ),
        );

        expect(mismatched._tag).toBe("Failure");

        for (const npc of [undefined, { ...gathering.npc, type: "COMMON" }]) {
          const invalidSource = yield* Effect.exit(
            deliver({ ...envelope, npc }, "hidden-source"),
          );

          expect(invalidSource._tag).toBe("Failure");
        }

        for (const target of targets.filter(
          (target) => target.scenario.name === "hidden-tier",
        ))
          expect(target.sent).toHaveLength(0);

        // A gathering announced with a message instead of an NPC has no NPC.
        const { npc: _gatheringNpc, ...messageGathering } = gathering;
        const { npc: _envelopeNpc, ...messageEnvelope } = envelope;

        yield* deliver(
          {
            ...messageEnvelope,
            notificationId: "message-gathering",
            update: {
              type: "UPSERT",
              gathering: {
                ...messageGathering,
                notificationId: "message-gathering",
              },
            },
          },
          "message-gathering-created",
        );

        const observers = targets.filter(
          (target) => target.scenario.name === "observer",
        );

        expect(observers).toHaveLength(2);

        for (const observer of observers)
          expect(observer.sent.map(decodeRealtimeFrame).at(-1)).toMatchObject({
            data: {
              payload: {
                type: "UPSERT",
                gathering: { notificationId: "message-gathering" },
              },
            },
          });
      }),
    ),
  );
});

const npcTopicPermissions = {
  "organization.timers": {
    read: Permission.LOOTLOG_TIMERS_READ,
    heroes: Permission.LOOTLOG_TIMERS_HEROES_READ,
    titans: Permission.LOOTLOG_TIMERS_TITANS_READ,
  },
  "organization.chat": {
    read: Permission.LOOTLOG_CHAT_READ,
    heroes: Permission.LOOTLOG_CHAT_HEROES_READ,
    titans: Permission.LOOTLOG_CHAT_TITANS_READ,
  },
  "organization.notifications": {
    read: Permission.LOOTLOG_NOTIFICATIONS_READ,
    heroes: Permission.LOOTLOG_NOTIFICATIONS_HEROES_READ,
    titans: Permission.LOOTLOG_NOTIFICATIONS_TITANS_READ,
  },
  "organization.loots": {
    read: Permission.LOOTLOG_LOOTS_READ,
    heroes: Permission.LOOTLOG_LOOTS_HEROES_READ,
    titans: Permission.LOOTLOG_LOOTS_TITANS_READ,
  },
} as const;

const allNpcReadPermissions = Object.values(npcTopicPermissions).flatMap(
  (permissions) => Object.values(permissions),
);

const npcDeliveryCases = (
  npcType: string,
  npcLevel: number,
  tier: "heroes" | "titans",
) =>
  [
    [
      "timers update",
      RabbitRoutingKey.GUILDS_TIMERS_UPDATE,
      "organization.timers",
      { npc: { lvl: npcLevel, type: npcType } },
    ],
    [
      "timers delete",
      RabbitRoutingKey.GUILDS_TIMERS_DELETE,
      "organization.timers",
      { npcId: 105, routing: { tier, npcLevel } },
    ],
    [
      "NPC chat",
      RabbitRoutingKey.GUILDS_SEND_MESSAGE,
      "organization.chat",
      { type: "NPC", npc: { lvl: npcLevel, type: npcType } },
    ],
    [
      "NPC party chat",
      RabbitRoutingKey.GUILDS_SEND_MESSAGE,
      "organization.chat",
      { type: "PARTY_GATHERING", npc: { lvl: npcLevel, type: npcType } },
    ],
    [
      "system party chat update",
      RabbitRoutingKey.GUILDS_UPDATE_MESSAGE,
      "organization.chat",
      {
        messageId: "message",
        message: "changed",
        routing: { tier, npcLevel },
      },
    ],
    [
      "chat delete",
      RabbitRoutingKey.GUILDS_DELETE_MESSAGE,
      "organization.chat",
      { messageId: "message", routing: { tier, npcLevel } },
    ],
    [
      "NPC notification",
      RabbitRoutingKey.GUILDS_NOTIFICATIONS_SEND,
      "organization.notifications",
      { npc: { lvl: npcLevel, type: npcType } },
    ],
    [
      "loot share",
      RabbitRoutingKey.GUILDS_LOOTS_SHARE_UPDATE,
      "organization.loots",
      {
        version: 2,
        lootId: 1,
        npcs: [{ lvl: npcLevel, type: npcType }],
        lootShare: {},
      },
    ],
  ] as const;

// Each topic must check its own tier permission: a denied reader holds every
// other topic's grants, and an allowed reader holds only this topic's.
for (const scenario of [
  {
    name: "level range",
    type: "HERO",
    level: 105,
    tier: "heroes",
    withholdTier: false,
  },
  {
    name: "titan permission",
    type: "TITAN",
    level: 250,
    tier: "titans",
    withholdTier: true,
  },
  {
    name: "hero permission",
    type: "HERO",
    level: 250,
    tier: "heroes",
    withholdTier: true,
  },
] as const) {
  for (const [name, routingKey, topic, data] of npcDeliveryCases(
    scenario.type,
    scenario.level,
    scenario.tier,
  )) {
    test(`${name} requires ${scenario.name} on game and web across gateways`, async () => {
      const { hubs } = await startHubs();
      const scope = { topic, organizationId: "organization-1" };
      const topicPermissions = npcTopicPermissions[topic];
      const tierPermission = topicPermissions[scenario.tier];

      const deniedPermissions = scenario.withholdTier
        ? allNpcReadPermissions.filter(
            (permission) => permission !== tierPermission,
          )
        : allNpcReadPermissions;

      const targets = hubs.flatMap((hub, i) =>
        (["game", "web-app"] as const).flatMap((platform) =>
          [false, true].map((allowed) => {
            const session = makeAdminSession(`${i}-${platform}-${allowed}`, {
              platform,
              guilds: [
                {
                  guild: { id: "organization-1", ownerId: "owner" },
                  roles: [
                    {
                      id: "permission",
                      permissions: allowed
                        ? [topicPermissions.read, tierPermission]
                        : deniedPermissions,
                      lvlRangeFrom: allowed ? 0 : 200,
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
              ],
            });

            const t = makeTestSocket(session);
            hub.register(t.socket);
            hub.subscribe(t.socket, scope);

            return { ...t, allowed };
          }),
        ),
      );

      const [local] = hubs;

      if (!local) throw new Error("Missing hub");
      const { bridge, deliver } = makeRabbitBridgeHarness(local);

      await Effect.runPromise(
        Effect.scoped(
          Effect.gen(function* () {
            yield* bridge.start();
            yield* deliver(
              routingKey,
              { guildId: "organization-1", ...data },
              { messageId: "npc-delivery" },
            );

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

test("chat capabilities and shared frames stay recipient-specific locally and remotely", async () => {
  const [local, remote] = await startPair();

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
      canDelete: true,
    },
    {
      id: "reader",
      permissions: [Permission.LOOTLOG_CHAT_READ],
      canDelete: false,
    },
    {
      id: "reader-2",
      permissions: [Permission.LOOTLOG_CHAT_READ],
      canDelete: false,
    },
    {
      id: "admin",
      permissions: [Permission.ADMIN],
      canDelete: true,
    },
    { id: "owner", permissions: [], canDelete: true },
  ];

  const targets = [local, remote].map((hub) =>
    viewers.map((viewer) => {
      const { socket, sent } = makeTestSocket(
        makeAdminSession(viewer.id, {
          discordId: viewer.id,
          guilds: [
            membership("organization-1", viewer.permissions, {
              roleId: "role",
            }),
          ],
        }),
      );

      hub.register(socket);
      hub.subscribe(socket, scope);

      return { sent };
    }),
  );

  await local.publishToScope(scope, {
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
        canDelete: true,
      },
    },
  });

  for (const group of targets) {
    for (const [index, viewer] of viewers.entries()) {
      expect(group[index]?.sent).toHaveLength(1);
      expect(decodeRealtimeFrame(group[index]?.sent[0] ?? "")).toMatchObject({
        data: {
          payload: {
            id: "message",
            canDelete: viewer.canDelete,
          },
        },
      });
    }

    expect(group[1]?.sent[0]).toBe(group[2]?.sent[0]);
  }
});

test("keeps basic and precise presence private for local and remote recipients", async () => {
  const [local, remote] = await startPair();

  const scope = {
    topic: "organization.presence",
    organizationId: "organization-1",
  } as const;

  const presenceMembership = (precise: boolean) =>
    membership(
      scope.organizationId,
      precise
        ? [
            Permission.LOOTLOG_ONLINE_PLAYERS_READ,
            Permission.LOOTLOG_PRESENCE_LOCATION_READ,
          ]
        : [Permission.LOOTLOG_ONLINE_PLAYERS_READ],
      { roleId: "role" },
    );

  const targets = [local, remote].flatMap((hub, index) =>
    [false, true].map((precise) => {
      const { socket, sent } = makeTestSocket(
        makeAdminSession(`presence-${index}-${precise}`, {
          guilds: [presenceMembership(precise)],
        }),
      );

      hub.register(socket);
      hub.subscribe(socket, scope);

      return { sent, session: socket.data, precise };
    }),
  );

  const presence = {
    userId: "player",
    sessionId: "game-session",
    organizationIds: [scope.organizationId],
    platform: "game",
    status: "online",
    confidence: "verified",
    isAfk: false,
    lastSeen: 1,
  } as const;

  const basic = {
    v: 1,
    type: "presence.delta",
    data: {
      organizationId: scope.organizationId,
      revision: 1,
      changes: [{ action: "upsert", presence }],
    },
  } as const;

  const precise = {
    ...basic,
    data: {
      ...basic.data,
      changes: [
        {
          action: "upsert",
          presence: {
            ...presence,
            location: { mapId: 7, map: "Ithan", x: 1, y: 2 },
          },
        },
      ],
    },
  } as const;

  await local.publishPresence(scope, basic, precise);

  // A permission change replaces the session's grants, as commitAccess does.
  for (const target of targets) {
    target.session.guilds = [presenceMembership(!target.precise)];
  }

  await local.publishPresence(scope, basic, precise);

  for (const target of targets) {
    const frames = target.sent.map((frame) => JSON.parse(frame));

    expect(frames).toEqual(
      target.precise ? [precise, basic] : [basic, precise],
    );
  }
});

test("expired API key sockets cannot receive responses or user-targeted events", async () => {
  const [hub] = await startPair();

  const target = makeTestSocket(
    withApiKey(
      makeAdminSession("integration", {
        guilds: [{ guild: { id: "123", ownerId: "owner" }, roles: [] }],
      }),
      ["123"],
      { keyId: "key", personalData: true, leaseExpiresAt: 0 },
    ),
  );

  hub.register(target.socket);
  await hub.publishToUser(target.socket.data.userId, {
    v: 1,
    type: "reservation.created",
    data: { organizationId: "123", payload: {} },
  });
  expect(target.sent).toHaveLength(0);
  expect(
    hub.sendResponse(target.socket, {
      v: 1,
      requestId: "request",
      status: "success",
      data: {},
    }),
  ).toBe(false);
  expect(target.sent).toHaveLength(0);
  expect(target.closes).toContain(1008);
});

test("API key user-targeted organization events stay inside selected current organizations", async () => {
  const [hub] = await startPair();

  const target = makeTestSocket(
    withApiKey(
      makeAdminSession("integration", {
        guilds: [{ guild: { id: "123", ownerId: "owner" }, roles: [] }],
      }),
      ["123"],
      { keyId: "key" },
    ),
  );

  hub.register(target.socket);
  await hub.publishToUser(target.socket.data.userId, {
    v: 1,
    type: "reservation.created",
    data: { organizationId: "456", payload: {} },
  });
  expect(target.sent).toHaveLength(0);
  await hub.publishToUser(target.socket.data.userId, {
    v: 1,
    type: "reservation.created",
    data: { organizationId: "123", payload: {} },
  });
  expect(target.sent).toHaveLength(1);
  await hub.publishToUser(target.socket.data.userId, {
    v: 1,
    type: "reservation.changed",
    data: {
      version: 2,
      action: "updated",
      sourceGuildId: "123",
      audienceGuildIds: ["123", "456"],
      reservationId: 1,
      spotId: null,
    },
  });
  expect(target.sent).toHaveLength(1);
});

// Regresses the 300 identical routing decodes that used to accompany one broadcast.
test("resolves timer routing once while preserving recipient authorization across a large audience", async () => {
  const routing = spyOn(npcRouting, "getNpcRoutingTier");

  try {
    const hub = makeHub();

    const scope = {
      topic: "organization.timers",
      organizationId: "organization-1",
    } as const;

    const targets = Array.from({ length: 300 }, (_, index) => {
      const target = makeTestSocket(
        makeAdminSession(String(index), {
          guilds: [
            membership(
              scope.organizationId,
              [
                Permission.LOOTLOG_TIMERS_READ,
                Permission.LOOTLOG_TIMERS_HEROES_READ,
              ],
              { roleId: "role", lvlRangeTo: index % 2 === 0 ? 500 : 50 },
            ),
          ],
        }),
      );

      hub.register(target.socket);
      hub.subscribe(target.socket, scope);

      return target;
    });

    await hub.publishToScope(scope, {
      v: 1,
      type: "timer.created",
      data: {
        organizationId: scope.organizationId,
        payload: { npc: { type: "HERO", lvl: 100 } },
      },
    });
    expect(routing).toHaveBeenCalledTimes(1);

    for (const [index, target] of targets.entries())
      expect(target.sent).toHaveLength(index % 2 === 0 ? 1 : 0);
  } finally {
    routing.mockRestore();
  }
});
