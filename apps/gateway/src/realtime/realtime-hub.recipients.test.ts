import * as npcRouting from "@lootlog/domain/npc-routing";
import {
  makeTestSocket,
  membership,
  withApiKey,
  makeHub,
  startPair,
  makeAdminSession,
} from "../../test/realtime-fixtures.js";
import { Capability } from "@lootlog/schema/permissions";
import { expect, spyOn, test } from "bun:test";
import { decodeRealtimeFrame } from "@lootlog/protocol/realtime/codec";

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
        Capability.LOOTLOG_CHAT_READ,
        Capability.LOOTLOG_CHAT_WRITE,
      ],
      canDelete: true,
    },
    {
      id: "reader",
      permissions: [Capability.LOOTLOG_CHAT_READ],
      canDelete: false,
    },
    {
      id: "reader-2",
      permissions: [Capability.LOOTLOG_CHAT_READ],
      canDelete: false,
    },
    {
      id: "admin",
      permissions: [Capability.ADMIN],
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
            Capability.LOOTLOG_ONLINE_PLAYERS_READ,
            Capability.LOOTLOG_PRESENCE_LOCATION_READ,
          ]
        : [Capability.LOOTLOG_ONLINE_PLAYERS_READ],
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
                Capability.LOOTLOG_TIMERS_READ,
                Capability.LOOTLOG_TIMERS_HEROES_READ,
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
