import { makeRabbitBridgeHarness } from "../../test/rabbit-fixtures.js";
import {
  makeTestSocket,
  membership,
  startHubs,
  makeHub,
  startPair,
  makeAdminSession,
  makeGamePresence,
} from "../../test/realtime-fixtures.js";
import { Permission } from "@lootlog/schema/permissions";
import { describe, expect, test } from "bun:test";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { Effect } from "effect";
import { getScopeKey } from "./realtime-audiences.js";
import { SubscriptionLimitExceeded } from "./realtime-errors.js";

describe("RealtimeHub federation", () => {
  test("delivers loot split choices and filter accepts to listed participants on any map of the world and every instance", async () => {
    const [local, remote] = await startPair();

    const scope = {
      topic: "map.pings",
      organizationId: "organization-1",
      world: "tempest",
    } as const;

    const scenarios = [
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
                killId: "hidden-kill",
                mapId: "hidden-map",
                heroNpcLvl: 300,
              },
              { messageId: routingKey },
            );

          for (const target of targets)
            expect(target.sent).toHaveLength(target.visible ? 4 : 0);

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

  test("keeps federated scope keys readable by replicas of the previous release and lists local scopes", () => {
    const hub = makeHub();

    const full = {
      topic: "map.air-tags",
      organizationId: "organization-1",
      eventId: "event-1",
      world: "tempest",
      mapId: 0,
    } as const;

    const partial = { topic: "map.air-tags", world: "tempest" } as const;

    expect(getScopeKey(full)).toBe(
      '["map.air-tags","organization-1","event-1","tempest",0]',
    );
    expect(getScopeKey(partial)).toBe(
      '["map.air-tags",null,null,"tempest",null]',
    );

    const target = makeTestSocket(makeAdminSession("local-scopes"));
    hub.register(target.socket);
    hub.subscribe(target.socket, full);
    hub.subscribe(target.socket, partial);
    hub.subscribe(target.socket, { topic: "organization.chat" });

    expect(hub.getLocalScopes("map.air-tags")).toEqual([full, partial]);
  });
});
