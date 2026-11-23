import {
  makeTestSocket,
  withApiKey,
  startPair,
  makeAdminSession,
  makeGamePresence,
} from "../../test/realtime-fixtures.js";
import { describe, expect, test } from "bun:test";
import type { SessionData } from "./session.js";

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
});
