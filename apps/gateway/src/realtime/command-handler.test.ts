import { RealtimeStoreError } from "./realtime-errors.js";
import { RpcUnavailableError } from "@lootlog/rpc/errors";
import { makeGuildStoreRedis } from "../../test/guild-store-fixtures.js";
import { describe, expect, test } from "bun:test";
import { Effect, Exit, Metric } from "effect";
import { createGatewayWebSocket } from "#src/app";
import { CommandIngress } from "./command-ingress.js";
import type { ClientCommand } from "@lootlog/protocol/realtime";
import { makeGuildStore } from "#src/guilds/guild-store";
import type { PresenceStore } from "#src/realtime/presence-store";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import {
  commandFrame,
  makeSession,
  makeTestSocket,
  subscribedFederationStore,
  unusedFederationStore,
  newSocket,
} from "../../test/realtime-fixtures.js";
import {
  guild,
  makeCommandHandler,
  onlinePresence,
  join,
  captureSpans,
} from "../../test/command-handler-fixtures.js";
import type { SessionData } from "#src/realtime/session";
import type { MargonemAccountVerifiedV1 } from "@lootlog/protocol/rabbit/events";

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

test("session join traces preserve failure status before sending a correlated rejection", async () => {
  const { handler, guilds, hub } = makeCommandHandler();
  guilds.guilds = [];
  const { socket } = newSocket();
  const { spans, tracer } = captureSpans();

  await Effect.runPromise(
    handler.handle(socket, join).pipe(Effect.withTracer(tracer)),
  );

  const command = spans.find(({ name }) => name === "gateway.command");
  expect(command?.attributes.get("rpc.method")).toBe("session.join");

  if (command?.status._tag !== "Ended")
    throw new Error("Join span did not finish");
  expect(Exit.isFailure(command.status.exit)).toBe(true);
  expect(hub.responses).toMatchObject([
    { requestId: "join", status: "error", error: { retryable: false } },
  ]);
});

test.each([
  ["binary", Buffer.from([0]), "1003", "unsupported_frame"],
  ["oversized", "x".repeat(300 * 1_024), "1006", "payload_limit"],
] as const)(
  "classifies rejected %s wire frames",
  async (_name, frame, closeCode, cause) => {
    const { handler } = makeCommandHandler();
    const data = makeSession({ joined: false });
    const tasks: Promise<unknown>[] = [];

    const ingress = new CommandIngress(
      (socket, message) => handler.handle(socket, message),
      (socket, message) => handler.rejectOverloaded(socket, message),
      () => Effect.void,
      (_label, effect) => {
        tasks.push(Effect.runPromiseExit(effect));
      },
    );

    const unexpectedRegistryCommand = () =>
      Promise.reject(new Error("Unexpected registry command"));

    const federationStore = {
      ...subscribedFederationStore,
      command: {
        set: async () => "OK",
        del: unexpectedRegistryCommand,
        sadd: unexpectedRegistryCommand,
        srem: unexpectedRegistryCommand,
        expire: unexpectedRegistryCommand,
        smembers: unexpectedRegistryCommand,
        mget: unexpectedRegistryCommand,
      },
    };

    const hub = new RealtimeHub(
      { maxBackpressureBytes: 1_024 },
      federationStore,
      () => {},
    );

    await Effect.runPromise(hub.start);

    const count = () => {
      const metric = Effect.runSync(Metric.snapshot).find(
        ({ id, attributes }) =>
          id === "lootlog_gateway_connection_lifetime_seconds" &&
          attributes?.platform === data.platform &&
          attributes?.joined === "no" &&
          attributes?.close_code === closeCode &&
          attributes?.cause === cause,
      );

      return metric?.type === "Histogram" ? metric.state.count : 0;
    };

    const before = count();

    const server = Bun.serve<SessionData>({
      port: 0,
      fetch(request, server) {
        if (server.upgrade(request, { data })) return;

        return new Response(null, { status: 400 });
      },
      websocket: createGatewayWebSocket({ hub, ingress }),
    });

    const client = new WebSocket(`ws://localhost:${server.port}`);

    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Socket did not close")),
          2_000,
        );

        client.addEventListener("open", () => client.send(frame));
        client.addEventListener("close", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      expect(count() - before).toBe(1);
    } finally {
      client.close();
      await server.stop(true);
      await Promise.all(tasks);
    }
  },
);

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
          reason: "organization-access-denied",
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

describe("CommandHandler session lifecycle", () => {
  test.each([false, true])(
    "permission API failure preserves cached client state during join (already joined: %s)",
    async (joined) => {
      const store = makeGuildStore(
        makeGuildStoreRedis({ discordId: "discord-1", userId: "user-1" }).store,
        {
          getUserGuildPermissions: () =>
            Effect.fail(new RpcUnavailableError({ message: "unavailable" })),
        },
      );

      const { handler, hub, activity, presence } = makeCommandHandler({
        guilds: store,
      });

      const { socket, closes } = newSocket({
        joined,
        guilds: joined ? [guild()] : [],
      });

      const previousGuilds = socket.data.guilds;
      const previousSubscriptions = socket.data.subscriptions;
      await Effect.runPromise(handler.handle(socket, join));
      expect(hub.responses).toEqual([
        {
          v: 1,
          requestId: "join",
          status: "error",
          error: {
            code: "COMMAND_REJECTED",
            reason: "temporarily-unavailable",
            message: "command temporarily unavailable",
            retryable: true,
          },
        },
      ]);
      expect(socket.data.guilds).toBe(previousGuilds);
      expect(socket.data.subscriptions).toBe(previousSubscriptions);
      expect(socket.data.joined).toBe(joined);
      expect(hub.events).toEqual([]);
      expect(closes).toEqual([]);
      expect(activity.calls).toEqual([]);
      expect(presence.reconciled).toEqual([]);
    },
  );

  test("rejects overloaded commands without joining or publishing activity", () => {
    const { handler, hub, activity } = makeCommandHandler();
    const { socket, closes } = newSocket();

    handler.rejectOverloaded(
      socket,
      commandFrame({ type: "session.join", data: {} }, "overloaded"),
    );

    expect(hub.responses).toEqual([
      {
        v: 1,
        requestId: "overloaded",
        status: "error",
        error: {
          code: "COMMAND_REJECTED",
          reason: "temporarily-unavailable",
          message: "command temporarily unavailable",
          retryable: true,
        },
      },
    ]);
    expect(socket.data.joined).toBe(false);
    expect(activity.calls).toEqual([]);
    expect(hub.events).toEqual([]);
    expect(closes).toEqual([]);
  });

  test("maps subscription exhaustion to a non-retryable rejection", async () => {
    const hub = new RealtimeHub(
      { maxBackpressureBytes: 1_024 },
      unusedFederationStore,
    );

    const { send } = makeCommandHandler({ hub });
    const { socket, sent, closes } = makeTestSocket(makeSession());

    for (let index = 0; index < 4_096; index += 1)
      hub.subscribe(socket, {
        topic: "party.ready-room",
        eventId: String(index),
      });

    for (const [requestId, eventId] of [
      ["over-capacity", "extra"],
      ["oversized", "ą".repeat(512)],
    ] as const)
      await send(
        socket,
        {
          type: "subscription.subscribe",
          data: { topic: "party.ready-room", eventId },
        },
        requestId,
      );

    expect(sent.map((frame) => JSON.parse(frame))).toEqual(
      ["over-capacity", "oversized"].map((requestId) => ({
        v: 1,
        requestId,
        status: "error",
        error: {
          code: "COMMAND_REJECTED",
          reason: "subscription-limit",
          message: "subscription limit exceeded",
          retryable: false,
        },
      })),
    );
    expect(socket.data.subscriptions.size).toBe(4_096);
    expect(closes).toEqual([]);
  });

  test("announces a verified Margonem account once and joins even when the announcement fails", async () => {
    const published: MargonemAccountVerifiedV1[] = [];

    const verifiedJoin = commandFrame({
      type: "session.join",
      data: {
        world: "alpha",
        character: {
          world: "alpha",
          name: "Hero",
          lvl: 100,
          icon: "hero.gif",
          characterId: "10",
          accountId: "20",
          prof: "w",
        },
        margonemAccountProof: {},
      },
    });

    for (const publishAccountVerified of [
      (event: MargonemAccountVerifiedV1) =>
        Effect.sync(() => published.push(event)),
      () => Effect.fail(new Error("RabbitMQ unavailable")),
    ]) {
      const { handler } = makeCommandHandler({
        verifier: { verify: () => Effect.succeed({ valid: true }) },
        publishAccountVerified,
      });

      const { socket } = newSocket({ platform: "game" });
      await Effect.runPromise(handler.handle(socket, verifiedJoin));
      expect(socket.data.joined).toBe(true);
      expect(socket.data.confidence).toBe("verified");
    }

    expect(published).toEqual([
      expect.objectContaining({
        version: 1,
        userId: "user-1",
        accountId: "20",
        characterId: "10",
        world: "alpha",
      }),
    ]);
  });
});
