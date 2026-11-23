import {
  canReadPolicyNpc,
  createAccessPolicySnapshot,
} from "@lootlog/protocol/realtime/access-policy";
import { describe, expect, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Predicate } from "effect";
import { canReadSourceEvent } from "./source-event-visibility.js";
import type { ClientCommand, ServerEvent } from "@lootlog/protocol/realtime";
import { decodeCommandSuccess } from "@lootlog/protocol/realtime/codec";
import type { AirTagService } from "#src/realtime/air-tag-service";
import {
  makeSession,
  makeTestSocket,
  withApiKey,
} from "../../test/realtime-fixtures.js";
import {
  guild,
  makeCommandHandler,
  unexpectedFeatures,
  join,
} from "../../test/command-handler-fixtures.js";

describe("CommandHandler session lifecycle", () => {
  test("answers air-tag.subscription with the settled acknowledgement", async () => {
    const settled =
      Promise.withResolvers<
        Effect.Success<ReturnType<AirTagService["updateSubscription"]>>
      >();

    const { send, hub } = makeCommandHandler({
      features: {
        airTags: {
          ...unexpectedFeatures.airTags,
          updateSubscription: () => Effect.promise(() => settled.promise),
        },
      },
    });

    const target = makeTestSocket(makeSession());

    const completed = send(
      target.socket,
      {
        type: "air-tag.subscription",
        data: { requestId: "air-tag-1", enabled: true, expectedMapId: 12 },
      },
      "request-air-tag",
    );

    await Bun.sleep(1);
    expect(hub.responses).toEqual([]);

    const acknowledgement = {
      status: "accepted" as const,
      requestId: "air-tag-1",
      scopes: [
        {
          guildId: "organization-1",
          world: "tempest",
          mapId: 12,
          epochId: "epoch-1",
          epochStartedAt: 1_700_000_000_000,
          revision: 3,
          targets: [],
        },
      ],
    };

    settled.resolve(acknowledgement);
    await completed;

    expect(hub.responses).toEqual([
      {
        v: 1,
        requestId: "request-air-tag",
        status: "success",
        data: acknowledgement,
      },
    ]);

    for (const response of hub.responses)
      expect(() =>
        decodeCommandSuccess(
          "air-tag.subscription",
          Predicate.hasProperty(response, "data") ? response.data : undefined,
        ),
      ).not.toThrow();
  });

  test("acknowledges a map.air-tags subscription only after other replicas can route to it", async () => {
    const registered = Promise.withResolvers<void>();

    const { send, hub } = makeCommandHandler({
      sessionFeatures: {
        airTags: {
          registerInterest: () => Effect.promise(() => registered.promise),
        },
      },
    });

    hub.subscribe = () => {};

    const target = makeTestSocket(makeSession({ guilds: [guild()] }));

    const handled = send(
      target.socket,
      {
        type: "subscription.subscribe",
        data: { topic: "map.air-tags", organizationId: "organization-1" },
      },
      "request-air-tags",
    );

    await Bun.sleep(1);
    expect(hub.responses).toEqual([]);

    registered.resolve();
    await handled;
    expect(hub.responses).toMatchObject([
      { requestId: "request-air-tags", status: "success" },
    ]);
  });

  test("a global chat subscriber gets the latest counts instead of waiting for the next sample", async () => {
    const { send, hub } = makeCommandHandler();

    hub.subscribe = () => {};

    hub.globalChatCounts = {
      online: 9,
      playersByWorld: { gordion: 3 },
      listeners: { "": 5, gordion: 2 },
    };

    const subscribe = (
      data: Extract<ClientCommand, { type: "subscription.subscribe" }>["data"],
    ) =>
      send(
        makeTestSocket(makeSession({ platform: "game", guilds: [guild()] }))
          .socket,
        { type: "subscription.subscribe", data },
        "request-chat",
      );

    await subscribe({ topic: "global.chat.world", world: "gordion" });
    await subscribe({ topic: "global.chat" });

    expect(hub.events).toEqual([
      {
        v: 1,
        type: "global-chat.stats",
        data: { world: "gordion", online: 3, listeners: 2 },
      },
      { v: 1, type: "global-chat.stats", data: { online: 9, listeners: 5 } },
    ]);
    expect(hub.responses).toMatchObject([
      { status: "success" },
      { status: "success" },
    ]);
  });
});

test("client NPC policy decisions match gateway source filtering across roles and tiers", () => {
  for (const viewer of ["member", "owner"]) {
    for (const permissions of [
      [],
      [Permission.ADMIN],
      [
        Permission.LOOTLOG_TIMERS_READ,
        Permission.LOOTLOG_CHAT_READ,
        Permission.LOOTLOG_NOTIFICATIONS_READ,
      ],
      [
        Permission.LOOTLOG_TIMERS_READ,
        Permission.LOOTLOG_TIMERS_TITANS_READ,
        Permission.LOOTLOG_CHAT_READ,
        Permission.LOOTLOG_CHAT_HEROES_READ,
      ],
    ]) {
      const session = makeSession({
        discordId: viewer,
        guilds: [
          {
            ...guild(permissions),
            roles: [
              { id: "role", lvlRangeFrom: 200, lvlRangeTo: 500, permissions },
            ],
          },
        ],
      });

      const policy = createAccessPolicySnapshot(session.guilds, viewer)
        .organizations[0];

      if (!policy) throw new Error("Missing fixture policy");

      for (const type of ["ELITE2", "HERO", "EVENT_HERO", "TITAN", "INVALID"]) {
        for (const lvl of [100, 250, 600]) {
          const npc = { type, lvl };

          for (const feature of ["timers", "chat", "notifications"] as const) {
            let event: ServerEvent;

            if (feature === "timers")
              event = {
                v: 1,
                type: "timer.created",
                data: { organizationId: "organization-1", payload: { npc } },
              };
            else if (feature === "chat")
              event = {
                v: 1,
                type: "chat.created",
                data: {
                  organizationId: "organization-1",
                  payload: { type: "NPC", npc },
                },
              };
            else
              event = {
                v: 1,
                type: "notification.sent",
                data: { organizationId: "organization-1", payload: { npc } },
              };
            expect(canReadPolicyNpc(policy, feature, npc)).toBe(
              canReadSourceEvent(session, event),
            );
          }
        }
      }
    }
  }
});

test("API key joins and rebalances preserve each key's organization scope without creating player activity", async () => {
  const { handler, guilds, hub, activity, presence } = makeCommandHandler();

  const { socket } = makeTestSocket(
    withApiKey(makeSession({ joined: false }), ["organization-1"], {
      keyId: "k1",
    }),
  );

  const other = makeTestSocket(
    withApiKey(makeSession({ joined: false }), ["organization-2"], {
      keyId: "k2",
    }),
  ).socket;

  guilds.guilds = [guild(), guild(undefined, "organization-2")];
  hub.sockets.push(socket, other);

  for (const target of [socket, other])
    await Effect.runPromise(handler.handle(target, join));
  expect(socket.data.guilds.map(({ guild }) => guild.id)).toEqual([
    "organization-1",
  ]);
  expect(other.data.guilds.map(({ guild }) => guild.id)).toEqual([
    "organization-2",
  ]);
  expect(
    [...socket.data.subscriptions.values()].every(
      (scope) => scope.organizationId === "organization-1",
    ),
  ).toBe(true);
  await Effect.runPromise(
    handler.rebalanceUser(socket.data.discordId, socket.data.userId),
  );
  expect(socket.data.guilds.map(({ guild }) => guild.id)).toEqual([
    "organization-1",
  ]);
  expect(other.data.guilds.map(({ guild }) => guild.id)).toEqual([
    "organization-2",
  ]);
  expect(activity.calls).toEqual([]);
  expect(presence.reconciled).toEqual([]);
});

test("API key sockets reject presence writes and expired leases before dispatch", async () => {
  const { handler, send, hub } = makeCommandHandler();

  const session = withApiKey(
    makeSession({ guilds: [guild()] }),
    ["organization-1"],
    { personalData: true },
  );

  if (session.apiKeyAccess)
    session.apiKeyAccess = { ...session.apiKeyAccess, mode: "read-write" };

  const { socket, closes } = makeTestSocket(session);

  await send(
    socket,
    { type: "presence.heartbeat", data: { sessionId: "session-1" } },
    "heartbeat",
  );
  expect(hub.responses).toEqual([
    {
      v: 1,
      requestId: "heartbeat",
      status: "error",
      error: {
        code: "COMMAND_REJECTED",
        reason: "organization-access-denied",
        message: "organization access denied",
        retryable: false,
      },
    },
  ]);

  socket.data.joined = false;
  socket.data.apiKeyLeaseExpiresAt = 0;
  await Effect.runPromise(handler.handle(socket, join));
  expect(closes).toEqual([1008]);
  expect(socket.data.joined).toBe(false);
});
