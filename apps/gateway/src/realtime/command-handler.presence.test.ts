import { describe, expect, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Exit, Metric } from "effect";
import {
  canReadPolicyNpc,
  createAccessPolicySnapshot,
} from "@lootlog/protocol/realtime/access-policy";
import type { ClientCommand, ServerEvent } from "@lootlog/protocol/realtime";
import type { PresenceStore } from "#src/realtime/presence-store";
import { RealtimeStoreError } from "./realtime-errors.js";
import { canReadSourceEvent } from "./source-event-visibility.js";
import {
  captureSpans,
  commandFrame,
  makeSession,
  makeTestSocket,
  onlinePresence,
} from "../../test/realtime-fixtures.js";
import {
  guild,
  makeCommandHandler,
} from "../../test/command-handler-fixtures.js";

test("heartbeat completion metrics include defects and interruptions without creating traces", async () => {
  const { handler, presence, hub } = makeCommandHandler();
  const { socket } = makeTestSocket(makeSession());
  const registry: Metric.MetricRegistry = new Map();
  const { spans, tracer } = captureSpans();

  const attempts: Array<PresenceStore["heartbeat"]> = [
    () => Effect.succeed(1_000),
    () =>
      Effect.fail(
        new RealtimeStoreError({
          operation: "presence.heartbeat",
          cause: new Error("dependency unavailable"),
        }),
      ),
    () => {
      throw new TypeError("dispatch defect");
    },
    () => Effect.interrupt,
  ];

  const exits = [];

  for (const heartbeat of attempts) {
    presence.heartbeat = heartbeat;
    exits.push(
      await Effect.runPromiseExit(
        handler
          .handle(
            socket,
            commandFrame(
              {
                type: "presence.heartbeat",
                data: { sessionId: socket.data.connectionId },
              },
              "heartbeat",
            ),
          )
          .pipe(
            Effect.provideService(Metric.MetricRegistry, registry),
            Effect.withTracer(tracer),
          ),
      ),
    );
  }

  expect(exits.map(Exit.isSuccess)).toEqual([true, true, false, false]);
  expect(hub.responses).toHaveLength(3);
  expect(spans).toEqual([]);

  const outcomes = Effect.runSync(
    Metric.snapshot.pipe(
      Effect.provideService(Metric.MetricRegistry, registry),
    ),
  ).filter(({ id }) => id === "lootlog_gateway_commands_completed_total");

  expect(outcomes.map(({ attributes }) => attributes?.outcome).sort()).toEqual([
    "defect",
    "interrupted",
    "retryable",
    "success",
  ]);
  expect(
    outcomes.every(({ state }) => "count" in state && state.count === 1),
  ).toBe(true);
});

describe("presence fetch delivery", () => {
  test.each([undefined, "response"] as const)(
    "answers with the snapshot and, unless delivery is response, also emits it as an event (%s)",
    async (delivery) => {
      const { send, hub, presence } = makeCommandHandler();
      const { socket } = makeTestSocket(makeSession({ guilds: [guild()] }));

      const snapshot = {
        organizationId: "organization-1",
        revision: 7,
        presences: [
          { ...onlinePresence(["organization-1"]), sessionId: "session-1" },
        ],
      };

      presence.snapshot = () => Effect.succeed(snapshot);

      let data: Extract<ClientCommand, { type: "presence.fetch" }>["data"] = {
        organizationId: "organization-1",
      };

      if (delivery) data = { ...data, delivery };

      await send(socket, { type: "presence.fetch", data }, "fetch-1");

      expect(hub.responses).toEqual([
        { v: 1, requestId: "fetch-1", status: "success", data: snapshot },
      ]);
      expect(hub.events).toEqual(
        delivery === "response"
          ? []
          : [{ v: 1, type: "presence.snapshot", sequence: 7, data: snapshot }],
      );
    },
  );

  test("does not expose a snapshot of a Lootlog the session cannot access", async () => {
    const { send, hub } = makeCommandHandler();
    const { socket } = makeTestSocket(makeSession());

    await send(
      socket,
      {
        type: "presence.fetch",
        data: { organizationId: "organization-1", delivery: "response" },
      },
      "denied",
    );

    expect(hub.events).toEqual([]);
    expect(hub.responses).toEqual([
      {
        v: 1,
        requestId: "denied",
        status: "error",
        error: {
          code: "COMMAND_REJECTED",
          message: "organization access denied",
          retryable: false,
        },
      },
    ]);
  });
});

describe("presence reciprocity", () => {
  const fetchPresence = {
    type: "presence.fetch",
    data: { organizationId: "organization-1", delivery: "response" },
  } as const;

  test("a game session reads a Lootlog's presence only while it publishes its own there", async () => {
    const { send, hub, presence, activity } = makeCommandHandler();

    const { socket } = makeTestSocket(
      makeSession({ platform: "game", guilds: [guild()] }),
    );

    presence.snapshot = (_viewer, organizationId) =>
      Effect.succeed({ organizationId, revision: 1, presences: [] });

    presence.publish = (target, data) =>
      Effect.sync(() => {
        target.data.presence =
          data.organizationIds.length === 0
            ? undefined
            : onlinePresence(data.organizationIds, target.data.platform);

        return undefined;
      });

    const publish = (requestId: string, organizationIds: string[]) =>
      send(
        socket,
        { type: "presence.publish", data: { organizationIds } },
        requestId,
      );

    const fetchResponse = async (requestId: string) => {
      await send(socket, fetchPresence, requestId);

      return hub.responses.at(-1);
    };

    expect(await fetchResponse("before")).toMatchObject({ status: "error" });

    await publish("visible", ["organization-1"]);
    expect(activity.calls).toContainEqual({
      type: "CONNECT_EVENT",
      ids: ["organization-1"],
    });
    expect(hub.events.at(-1)).toMatchObject({
      type: "permissions.updated",
      data: {
        changes: [{ organizationId: "organization-1", expanded: true }],
        subscriptionScopes: expect.arrayContaining([
          { topic: "organization.presence", organizationId: "organization-1" },
        ]),
      },
    });
    expect(await fetchResponse("while-visible")).toMatchObject({
      status: "success",
    });

    await publish("hidden", []);
    expect(hub.events.at(-1)).toMatchObject({
      type: "permissions.updated",
      data: {
        changes: [{ organizationId: "organization-1", restricted: true }],
      },
    });
    expect(await fetchResponse("after")).toMatchObject({ status: "error" });
  });

  test("a failed publication opens no Lootlog the session was not already visible in", async () => {
    const { send, hub, presence } = makeCommandHandler();

    const { socket } = makeTestSocket(
      makeSession({ platform: "game", guilds: [guild()] }),
    );

    presence.snapshot = (_viewer, organizationId) =>
      Effect.succeed({ organizationId, revision: 1, presences: [] });

    presence.publish = (target, data) =>
      Effect.sync(() => {
        target.data.presence = onlinePresence(
          data.organizationIds,
          target.data.platform,
        );
      }).pipe(
        Effect.andThen(
          Effect.fail(
            new RealtimeStoreError({
              operation: "presence.publish",
              cause: new Error("Redis unavailable"),
            }),
          ),
        ),
      );

    await send(
      socket,
      {
        type: "presence.publish",
        data: { organizationIds: ["organization-1"] },
      },
      "failed",
    );
    await send(socket, fetchPresence, "after-failure");

    expect(socket.data.presence).toBeUndefined();
    expect(hub.events).toEqual([]);
    expect(hub.responses.at(-1)).toMatchObject({
      requestId: "after-failure",
      status: "error",
    });
  });
});

describe("CommandHandler presence commands", () => {
  test("a socket closing after a federation gap acts on no command", async () => {
    const { send, hub, presence } = makeCommandHandler();
    const { socket } = makeTestSocket(makeSession({ closing: true }));
    let heartbeats = 0;

    presence.heartbeat = () =>
      Effect.sync(() => {
        heartbeats++;

        return 1;
      });

    await send(
      socket,
      { type: "presence.heartbeat", data: { sessionId: "presence-1" } },
      "heartbeat",
    );

    expect(heartbeats).toBe(0);
    expect(hub.responses).toMatchObject([
      { requestId: "heartbeat", status: "error", error: { retryable: true } },
    ]);
  });

  test.each([
    {
      name: "a typed rejection",
      joined: false,
      heartbeat: () => Effect.die("Unexpected heartbeat"),
      message: "session.join is required",
      retryable: false,
    },
    {
      name: "a dependency failure",
      joined: true,
      heartbeat: () =>
        Effect.fail(
          new RealtimeStoreError({
            operation: "presence.heartbeat",
            cause: new Error("database secret"),
          }),
        ),
      message: "command temporarily unavailable",
      retryable: true,
    },
    {
      name: "a defect",
      joined: true,
      heartbeat: () => Effect.die(new Error("database secret")),
      message: "command temporarily unavailable",
      retryable: true,
    },
  ] satisfies Array<{
    name: string;
    joined: boolean;
    heartbeat: PresenceStore["heartbeat"];
    message: string;
    retryable: boolean;
  }>)(
    "answers $name with a redacted command error",
    async ({ joined, heartbeat, message, retryable }) => {
      const { handler, hub, presence } = makeCommandHandler();
      const target = makeTestSocket(makeSession({ joined }));
      presence.heartbeat = heartbeat;

      await Effect.runPromiseExit(
        handler.handle(
          target.socket,
          commandFrame(
            { type: "presence.heartbeat", data: { sessionId: "connection-1" } },
            "heartbeat",
          ),
        ),
      );

      expect(hub.responses).toEqual([
        {
          v: 1,
          requestId: "heartbeat",
          status: "error",
          error: { code: "COMMAND_REJECTED", message, retryable },
        },
      ]);
    },
  );
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
