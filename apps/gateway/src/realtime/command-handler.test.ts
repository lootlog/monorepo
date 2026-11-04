import { RealtimeStoreError } from "./realtime-errors.js";
import { httpClientFromResponses } from "../../test/http-fixtures.js";
import { makeGuildStoreRedis } from "../../test/guild-store-fixtures.js";
import {
  canReadPolicyNpc,
  createAccessPolicySnapshot,
} from "@lootlog/protocol/realtime/access-policy";
import { describe, expect, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Exit, Fiber, Metric, Predicate, Tracer } from "effect";
import { TestClock } from "effect/testing";
import { createGatewayWebSocket } from "#src/app";
import { CommandIngress } from "./command-ingress.js";
import { CommandAdmission } from "./command-admission.js";
import { canReadSourceEvent } from "./source-event-visibility.js";
import {
  decodeServerEvent,
  type ClientCommand,
  type ServerEvent,
} from "@lootlog/protocol/realtime";
import { decodeCommandSuccess } from "@lootlog/protocol/realtime/codec";
import {
  GuildStoreFailure,
  makeGuildStore,
  type GuildStore,
} from "#src/guilds/guild-store";
import type { AirTagService } from "#src/realtime/air-tag-service";
import type { PresenceStore } from "#src/realtime/presence-store";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import {
  commandFrame,
  makeFederationBus,
  makeSession,
  makeTestSocket,
  subscribedFederationStore,
  unusedFederationStore,
  withApiKey,
} from "../../test/realtime-fixtures.js";
import {
  FakePresence,
  guild,
  makeCommandHandler,
  unexpectedFeatures,
} from "../../test/command-handler-fixtures.js";
import type { SessionData } from "#src/realtime/session";
import type { MargonemAccountVerifiedV1 } from "@lootlog/protocol/rabbit/events";
import type { FederatedRealtimeMessage } from "#src/platform/redis-store";

/** A socket that has not joined yet. */
const newSocket = (overrides: Partial<SessionData> = {}) =>
  makeTestSocket(makeSession({ joined: false, ...overrides }));

const onlinePresence = (
  organizationIds: ReadonlyArray<string>,
  platform: SessionData["platform"] = "web-app",
): NonNullable<SessionData["presence"]> => ({
  userId: "user-1",
  sessionId: "connection-1",
  organizationIds: [...organizationIds],
  platform,
  status: "online",
  confidence: "reported",
  isAfk: false,
  lastSeen: 1,
});

const join = commandFrame({ type: "session.join", data: {} }, "join");

const captureSpans = () => {
  const spans: Tracer.Span[] = [];

  const tracer = Tracer.make({
    span: (options) => {
      const span = new Tracer.NativeSpan(options);
      spans.push(span);

      return span;
    },
  });

  return { spans, tracer };
};

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
  // A defect is answered so the client retries; an interruption is not.
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

    await Effect.runPromise(hub.start());

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

    // The local record changes before the Redis write fails.
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
        { apiUrl: "http://api.local" },
        makeGuildStoreRedis({ discordId: "discord-1", userId: "user-1" }).store,
        httpClientFromResponses(() =>
          Effect.succeed(new Response("invalid API response")),
        ),
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

  test("keeps game sessions available when Margonem proof is unavailable", async () => {
    const { send, hub, activity } = makeCommandHandler();
    const { socket } = newSocket({ platform: "game" });

    await send(socket, {
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
          clan: { id: 30, name: "Clan", rank: 1 },
        },
      },
    });

    expect(socket.data.joined).toBe(true);
    expect(socket.data.confidence).toBe("reported");
    // A Lootlog logs the character only once it publishes presence there.
    expect(activity.calls).toEqual([]);
    expect(hub.responses).toContainEqual(
      expect.objectContaining({ requestId: "request-1", status: "success" }),
    );
  });

  test("joins over replica capacity get a retry delay without reading permissions", async () => {
    const gate = Promise.withResolvers<void>();
    let requests = 0;
    let now = 0;

    const store = makeGuildStore(
      { apiUrl: "http://api.local" },
      makeGuildStoreRedis({ discordId: "discord-1", userId: "user-1" }).store,
      httpClientFromResponses(() =>
        Effect.promise(async () => {
          requests++;
          await gate.promise;

          return Response.json([guild()]);
        }),
      ),
    );

    const { send, hub } = makeCommandHandler({
      guilds: store,
      joinAdmission: new CommandAdmission(
        {
          ratePerSecond: 1,
          burst: 2,
          concurrent: 1,
          retryAfterMs: { min: 1_000, max: 5_000 },
        },
        () => now,
        () => 0.5,
      ),
    });

    const joinFresh = (requestId: string) =>
      send(newSocket().socket, { type: "session.join", data: {} }, requestId);

    const running = joinFresh("running");

    while (requests === 0) await Bun.sleep(1);
    // A second join waits for the running one instead of adding API load.
    await joinFresh("concurrent");
    gate.resolve();
    await running;
    await joinFresh("admitted");
    // The burst is spent; a token refills after one second.
    await joinFresh("drained");
    now = 1_000;
    await joinFresh("refilled");

    const busy = {
      error: {
        code: "COMMAND_REJECTED",
        message: "gateway is busy",
        retryable: true,
        retryAfterMs: 3_000,
      },
    };

    expect(
      hub.responses.map((response) =>
        Predicate.hasProperty(response, "error")
          ? { error: response.error }
          : "joined",
      ),
    ).toEqual([busy, "joined", "joined", busy, "joined"]);
    expect(requests).toBe(1);
  });

  test("AirTag batches over replica capacity get a rate-limited acknowledgement and release their slot", async () => {
    const stalled = Promise.withResolvers<void>();
    let merges = 0;

    const { send, hub } = makeCommandHandler({
      features: {
        airTags: {
          ...unexpectedFeatures.airTags,
          publishObservations: () =>
            Effect.promise(async () => {
              merges++;
              await stalled.promise;

              return {
                status: "accepted",
                acceptedScopes: 1,
                acceptedTargets: 1,
              } as const;
            }),
        },
        airTagObservationAdmission: new CommandAdmission(
          {
            ratePerSecond: 0,
            burst: 2,
            concurrent: 1,
            retryAfterMs: { min: 1_000, max: 3_000 },
          },
          () => 0,
          () => 0.5,
        ),
      },
    });

    const { socket } = makeTestSocket(makeSession());

    const observe = (requestId: string) =>
      send(
        socket,
        {
          type: "air-tag.observation",
          data: {
            expectedMapId: 12,
            observations: [
              { targetId: "7", nickname: "Wróg", relation: 2, x: 1, y: 1 },
            ],
          },
        },
        requestId,
      );

    const running = observe("running");

    while (merges === 0) await Bun.sleep(1);
    // The running batch holds the only slot; a second one must not queue behind it.
    await observe("concurrent");
    stalled.resolve();
    await running;
    await observe("admitted");
    // The burst is spent and nothing refills it.
    await observe("drained");

    const accepted = {
      status: "accepted",
      acceptedScopes: 1,
      acceptedTargets: 1,
    };

    const rateLimited = {
      status: "rejected",
      code: "rate-limited",
      retryAfterMs: 2_000,
    };

    expect(merges).toBe(2);
    expect(
      hub.responses.map((response) =>
        Predicate.hasProperty(response, "requestId") &&
        Predicate.hasProperty(response, "data")
          ? [response.requestId, response.data]
          : response,
      ),
    ).toEqual([
      ["concurrent", rateLimited],
      ["running", accepted],
      ["admitted", accepted],
      ["drained", rateLimited],
    ]);
  });

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

  test("answers connection.ping for joined game and unjoined API key sockets", async () => {
    const { send, hub } = makeCommandHandler();
    const game = makeTestSocket(makeSession({ platform: "game" })).socket;

    const integration = makeTestSocket(
      withApiKey(makeSession({ joined: false }), ["organization-1"]),
    ).socket;

    await send(game, { type: "connection.ping", data: {} }, "game-ping");
    await send(
      integration,
      { type: "connection.ping", data: {} },
      "integration-ping",
    );

    // Compare the serialized frames: an undefined `data` would vanish on the wire.
    expect(hub.responses.map((r) => JSON.parse(JSON.stringify(r)))).toEqual([
      { v: 1, requestId: "game-ping", status: "success", data: {} },
      { v: 1, requestId: "integration-ping", status: "success", data: {} },
    ]);
  });

  test("does not fetch permissions for a different Discord identity on the same user", async () => {
    const { handler, guilds, hub } = makeCommandHandler();
    const target = newSocket({ discordId: "other-discord" });
    hub.sockets.push(target.socket);
    guilds.getUserGuilds = () =>
      Effect.die("unrelated identity must not load permissions");
    await Effect.runPromise(handler.rebalanceUser("discord-1", "user-1"));
    expect(hub.events).toEqual([]);
  });

  test("rebalances current sockets after a permissions request replaces a connection", async () => {
    const { handler, guilds, hub } = makeCommandHandler();
    const old = newSocket({ guilds: [guild()] });
    const current = newSocket({ guilds: [guild()] });
    hub.sockets.push(old.socket);
    guilds.getUserGuilds = () =>
      Effect.sync(() => {
        hub.sockets.splice(0, 1, current.socket);

        return [];
      });
    await Effect.runPromise(handler.rebalanceUser("discord-1", "user-1"));
    expect(old.closes).toEqual([]);
    expect(current.closes).toEqual([1008]);
  });

  test("repeated equivalent rebalances refresh server roles without emitting client invalidations", async () => {
    const { handler, guilds, hub, presence } = makeCommandHandler();

    const target = makeTestSocket(
      makeSession({ guilds: [guild([Permission.LOOTLOG_TIMERS_READ])] }),
    );

    target.socket.data.subscriptions.set("custom", {
      topic: "party.ready-room",
    });
    const subscriptions = target.socket.data.subscriptions;
    hub.sockets.push(target.socket);
    guilds.guilds = [
      {
        ...guild(),
        roles: [
          {
            id: "replacement-1",
            lvlRangeFrom: 0,
            lvlRangeTo: 300,
            permissions: [Permission.LOOTLOG_TIMERS_READ],
          },
          {
            id: "replacement-2",
            lvlRangeFrom: 200,
            lvlRangeTo: 500,
            permissions: [Permission.LOOTLOG_TIMERS_READ],
          },
        ],
      },
    ];

    for (let index = 0; index < 4; index++) {
      await Effect.runPromise(handler.rebalanceUser("discord-1", "user-1"));
    }

    expect(target.socket.data.guilds).toBe(guilds.guilds);
    expect(target.socket.data.subscriptions).toBe(subscriptions);
    expect(hub.events).toEqual([]);
    expect(presence.reconciled).toEqual([]);
  });

  test("revoking one air-tag scope preserves authorized scopes in other organizations", async () => {
    const { handler, guilds, hub } = makeCommandHandler();
    const two = guild(undefined, "organization-2");
    const target = makeTestSocket(makeSession({ guilds: [guild(), two] }));

    const scope = (guildId: string) => ({
      guildId,
      world: "fobos",
      mapId: 1,
      subscription: {
        topic: "map.air-tags" as const,
        organizationId: guildId,
        world: "fobos",
        mapId: 1,
      },
    });

    const retained = scope("organization-2");
    target.socket.data.airTagScopes = [scope("organization-1"), retained];
    target.socket.data.subscriptions = new Map(
      target.socket.data.airTagScopes.map((entry) => [
        entry.guildId,
        entry.subscription,
      ]),
    );
    hub.sockets.push(target.socket);
    guilds.guilds = [guild([Permission.LOOTLOG_CHAT_READ]), two];
    await Effect.runPromise(handler.rebalanceUser("discord-1", "user-1"));
    expect(target.socket.data.airTagScopes).toEqual([retained]);
    expect(
      [...target.socket.data.subscriptions.values()].filter(
        (entry) => entry.topic === "map.air-tags",
      ),
    ).toEqual([retained.subscription]);
  });

  test("rejoins keep one connect activity and a stable compact policy version until access changes", async () => {
    const { handler, guilds, hub, activity } = makeCommandHandler();
    const target = newSocket();

    await Effect.runPromise(handler.handle(target.socket, join));
    await Effect.runPromise(handler.handle(target.socket, join));

    const readPolicy = (index: number) => {
      const event = hub.events[index];
      const decoded = decodeServerEvent(event);

      if (decoded.type !== "session.joined" || !decoded.data.accessPolicy)
        throw new Error("Missing joined policy");

      return decoded.data.accessPolicy;
    };

    const previous = readPolicy(0);
    expect(previous.version).toMatch(/^[a-f0-9]{64}$/);
    expect(readPolicy(1)).toEqual(previous);
    expect(hub.responses[0]).toMatchObject({
      data: { connectionId: "connection-1" },
    });
    expect(hub.events[0]).toMatchObject({
      data: { connectionId: "connection-1" },
    });
    expect(activity.calls.map(({ type }) => type)).toEqual(["CONNECT_EVENT"]);
    guilds.guilds = [guild([Permission.LOOTLOG_CHAT_READ])];
    await Effect.runPromise(handler.handle(target.socket, join));
    expect(readPolicy(2).version).not.toBe(previous.version);
  });

  test.each([false, true])(
    "a denied join sends an empty policy before rejecting, previously joined: %s",
    async (previouslyJoined) => {
      const { handler, guilds, hub, activity, presence } = makeCommandHandler();

      const target = newSocket();

      if (previouslyJoined) {
        target.socket.data.joined = true;
        target.socket.data.guilds = [guild()];
        target.socket.data.subscriptions.set("old-scope", {
          topic: "organization.presence",
          organizationId: "organization-1",
        });
        target.socket.data.airTagScopes = [
          {
            guildId: "organization-1",
            world: "fobos",
            mapId: 1,
            subscription: {
              topic: "map.air-tags",
              organizationId: "organization-1",
              world: "fobos",
              mapId: 1,
            },
          },
        ];
        target.socket.data.presence = onlinePresence(["organization-1"]);
      }

      guilds.guilds = [];
      await Effect.runPromise(
        handler.handle(
          target.socket,
          commandFrame({ type: "session.join", data: {} }, "denied-join"),
        ),
      );
      expect(hub.events).toHaveLength(1);
      expect(hub.deliveryOrder).toEqual(["event", "response"]);
      const event = decodeServerEvent(hub.events[0]);
      expect(event).toMatchObject({
        type: "permissions.updated",
        data: {
          organizationIds: [],
          subscriptionScopes: [],
          accessPolicy: { organizations: [] },
        },
      });

      if (event.type !== "permissions.updated")
        throw new Error("Missing policy event");
      expect(event.data.accessPolicy?.version).toMatch(/^[a-f0-9]{64}$/);
      expect(hub.responses).toEqual([
        {
          v: 1,
          requestId: "denied-join",
          status: "error",
          error: {
            code: "COMMAND_REJECTED",
            message: "no authorized organizations",
            retryable: false,
          },
        },
      ]);
      expect(target.socket.data.guilds).toEqual([]);
      expect(target.socket.data.joined).toBe(false);
      expect(target.socket.data.subscriptions.size).toBe(0);
      expect(target.socket.data.airTagScopes).toEqual([]);
      // The presence fake only records, so this proves the handler clears it.
      expect(target.socket.data.presence).toBeUndefined();
      expect(presence.reconciled).toEqual([target.socket]);
      expect(activity.calls).toEqual(
        previouslyJoined
          ? [{ type: "DISCONNECT_EVENT", ids: ["organization-1"] }]
          : [],
      );
    },
  );

  test("revokes every local socket before failed activity and presence I/O can deliver organization frames", async () => {
    const gate = Promise.withResolvers<void>();
    const entered = Promise.withResolvers<void>();

    const hub = new RealtimeHub(
      { maxBackpressureBytes: 1_024 },
      { ...unusedFederationStore, publish: async () => {} },
    );

    const retainedGuild = guild(
      [Permission.LOOTLOG_CHAT_READ],
      "organization-2",
    );

    const targets = ["one", "two"].map((connectionId) => {
      const target = makeTestSocket(
        makeSession({
          connectionId,
          guilds: [guild([Permission.LOOTLOG_CHAT_READ]), retainedGuild],
        }),
      );

      hub.register(target.socket);

      for (const organizationId of ["organization-1", "organization-2"])
        hub.subscribe(target.socket, {
          topic: "organization.chat",
          organizationId,
        });

      return target;
    });

    const presenceAttempts: string[] = [];
    const presence = new FakePresence();

    presence.reconcileAccess = (socket) =>
      Effect.suspend(() => {
        presenceAttempts.push(socket.data.connectionId);

        return Effect.fail(new Error("Redis unavailable"));
      });

    const { handler } = makeCommandHandler({
      guilds: {
        getUserGuilds: () => Effect.succeed([retainedGuild]),
        invalidate: () => Effect.void,
      },
      presence,
      hub,
      activity: {
        publish: () =>
          Effect.promise(async () => {
            entered.resolve();
            await gate.promise;
          }).pipe(Effect.andThen(Effect.die("Rabbit unavailable"))),
      },
    });

    const publish = (organizationId: string) =>
      hub.publishToScope(
        { topic: "organization.chat", organizationId },
        { v: 1, type: "chat.cleared", data: { organizationId, payload: {} } },
      );

    const frames = (target: (typeof targets)[number]) =>
      target.sent.map((frame) => JSON.parse(frame));

    await publish("organization-1");

    const rebalance = Effect.runPromise(
      handler.rebalanceUser("discord-1", "user-1"),
    );

    await entered.promise;

    try {
      await publish("organization-1");
      await publish("organization-2");

      for (const target of targets) {
        const received = frames(target);

        expect(received).toHaveLength(3);
        expect(received[1]).toMatchObject({
          type: "permissions.updated",
          data: { organizationIds: ["organization-2"] },
        });
        expect(received[2]).toMatchObject({
          type: "chat.cleared",
          data: { organizationId: "organization-2" },
        });
        expect(target.closes).toEqual([]);
      }
    } finally {
      gate.resolve();
      await rebalance;
    }

    expect(presenceAttempts.sort()).toEqual(["one", "two"]);
    await Effect.runPromise(handler.rebalanceUser("discord-1", "user-1"));
    await publish("organization-1");

    for (const target of targets) expect(frames(target)).toHaveLength(3);
  });

  test("reconnects after a permission update transport throws without blocking other sockets", async () => {
    const { handler, guilds, hub } = makeCommandHandler();
    const targets = [newSocket(), newSocket()];

    for (const target of targets) {
      target.socket.data.joined = true;
      target.socket.data.guilds = [guild()];
      hub.sockets.push(target.socket);
    }

    guilds.guilds = [guild([Permission.LOOTLOG_CHAT_READ])];
    const sendEvent = hub.sendEvent.bind(hub);
    hub.sendEvent = (socket, event) => {
      if (socket === targets[0]?.socket) throw new Error("Transport closed");

      return sendEvent(socket, event);
    };

    await Effect.runPromise(handler.rebalanceUser("discord-1", "user-1"));
    expect(targets[0]?.closes).toEqual([1013]);
    expect(targets[1]?.closes).toEqual([]);
    expect(hub.events).toHaveLength(1);
    expect(hub.events[0]).toMatchObject({ type: "permissions.updated" });
  });

  test.each([
    {
      failure: "invalidation",
      invalidate: () =>
        Effect.fail(
          new GuildStoreFailure({ reason: "cache", retryable: true }),
        ),
      remoteCloses: [1008],
    },
    {
      failure: "publication",
      publish: () => Promise.reject(new Error("Redis unavailable")),
      remoteCloses: [],
    },
    {
      failure: "stalled publication",
      publish: () => new Promise<void>(() => {}),
      remoteCloses: [],
    },
  ] satisfies Array<{
    failure: string;
    publish?: ConstructorParameters<typeof RealtimeHub>[1]["publish"];
    invalidate?: GuildStore["invalidate"];
    remoteCloses: number[];
  }>)(
    "attempts remote and local revocation despite a $failure failure and preserves the Rabbit retry",
    async ({ publish, invalidate, remoteCloses }) => {
      const bus = makeFederationBus();
      const background: Promise<void>[] = [];

      const runBackground = (
        _label: string,
        task: Effect.Effect<void, unknown>,
      ) => {
        background.push(Effect.runPromise(task));
      };

      const replica = (
        publishControl: ConstructorParameters<typeof RealtimeHub>[1]["publish"],
        invalidateCache: GuildStore["invalidate"],
      ) => {
        const hub = new RealtimeHub(
          { maxBackpressureBytes: 1_024 },
          { ...bus.store, publish: publishControl },
          runBackground,
        );

        const { handler } = makeCommandHandler({
          hub,
          guilds: {
            invalidate: invalidateCache,
            getUserGuilds: () => Effect.succeed([]),
          },
        });

        const target = makeTestSocket(makeSession({ guilds: [guild()] }));

        hub.register(target.socket);
        hub.subscribe(target.socket, {
          topic: "organization.presence",
          organizationId: "organization-1",
        });

        return { hub, handler, target };
      };

      const local = replica(
        publish ?? bus.store.publish,
        invalidate ?? (() => Effect.void),
      );

      const remote = replica(bus.store.publish, () => Effect.void);

      for (const { hub } of [local, remote])
        await Effect.runPromise(hub.start());

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const rebalance = yield* Effect.exit(
            local.handler.rebalanceAcrossInstances("discord-1", "user-1"),
          ).pipe(Effect.forkChild);

          yield* TestClock.adjust("11 seconds");

          return yield* Fiber.join(rebalance);
        }).pipe(Effect.provide(TestClock.layer())),
      );

      await Promise.all(background);

      expect(Exit.isFailure(result)).toBe(true);
      expect(local.target.socket.data.guilds).toEqual([]);
      expect(
        [...local.target.socket.data.subscriptions.values()].some(
          (scope) => scope.organizationId === "organization-1",
        ),
      ).toBe(false);
      expect(local.target.closes).toEqual([1008]);
      expect(remote.target.closes).toEqual(remoteCloses);
    },
  );

  const unavailablePermissions = (retryable = true) => {
    let lookups = 0;

    const store: GuildStore = {
      invalidate: () => Effect.void,
      getUserGuilds: () => {
        lookups += 1;

        return Effect.fail(
          new GuildStoreFailure({ reason: "transport", retryable }),
        );
      },
    };

    return { store, lookups: () => lookups };
  };

  test("reconnects local sockets when their permission refresh stays unavailable without failing Rabbit delivery", async () => {
    const hub = new RealtimeHub(
      { maxBackpressureBytes: 1_024 },
      { ...unusedFederationStore, publish: async () => {} },
    );

    const permissions = unavailablePermissions();
    const { handler } = makeCommandHandler({ guilds: permissions.store, hub });
    const affected = makeTestSocket(makeSession({ guilds: [guild()] }));

    const unrelated = makeTestSocket(
      makeSession({
        connectionId: "connection-2",
        discordId: "discord-2",
        guilds: [guild()],
      }),
    );

    for (const target of [affected, unrelated]) hub.register(target.socket);

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const rebalance = yield* Effect.exit(
          handler.rebalanceAcrossInstances("discord-1", "user-1"),
        ).pipe(Effect.forkChild);

        yield* TestClock.adjust("30 seconds");

        return yield* Fiber.join(rebalance);
      }).pipe(Effect.provide(TestClock.layer())),
    );

    expect(Exit.isSuccess(result)).toBe(true);
    expect(permissions.lookups()).toBe(4);
    expect(affected.closes).toEqual([1013]);
    expect(unrelated.closes).toEqual([]);
    expect(hub.getLocalSockets()).toEqual([unrelated.socket]);
  });

  test("a confirmed membership removal revokes the Organization before the permission refresh", async () => {
    const { handler, hub } = makeCommandHandler({
      guilds: unavailablePermissions().store,
    });

    const target = makeTestSocket(
      makeSession({ guilds: [guild(), guild(undefined, "organization-2")] }),
    );

    hub.sockets.push(target.socket);

    await Effect.runPromise(
      Effect.gen(function* () {
        const rebalance = yield* handler
          .rebalanceAcrossInstances("discord-1", "user-1", "organization-1")
          .pipe(Effect.forkChild);

        yield* Effect.yieldNow;
        expect(
          target.socket.data.guilds.map(({ guild: entry }) => entry.id),
        ).toEqual(["organization-2"]);
        expect(
          [...target.socket.data.subscriptions.values()].some(
            (scope) => scope.organizationId === "organization-1",
          ),
        ).toBe(false);
        expect(hub.events).toMatchObject([{ type: "permissions.updated" }]);
        expect(target.closes).toEqual([]);

        yield* TestClock.adjust("30 seconds");
        yield* Fiber.join(rebalance);
      }).pipe(Effect.provide(TestClock.layer())),
    );

    expect(target.closes).toEqual([1013]);
  });

  test.each([
    { retryable: true, lookups: 4 },
    { retryable: false, lookups: 1 },
  ])(
    "a received rebalance retries only retryable failures before reconnecting ($retryable)",
    async ({ retryable, lookups }) => {
      let receive: (message: FederatedRealtimeMessage) => void = () => {};

      const tasks: Array<Effect.Effect<void, unknown>> = [];

      const hub = new RealtimeHub(
        { maxBackpressureBytes: 1_024 },
        {
          ...unusedFederationStore,
          subscribe: async (listener) => {
            receive = listener;
          },
        },
        (_, task) => {
          tasks.push(task);
        },
      );

      const permissions = unavailablePermissions(retryable);
      makeCommandHandler({ guilds: permissions.store, hub });
      await Effect.runPromise(hub.start());
      const target = makeTestSocket(makeSession({ guilds: [guild()] }));
      hub.register(target.socket);

      receive({
        id: "control-1",
        sourceInstanceId: "another-instance",
        control: {
          type: "permissions.rebalance",
          discordId: "discord-1",
          userId: "user-1",
        },
      });

      await Effect.runPromise(
        Effect.gen(function* () {
          for (const task of tasks) yield* task.pipe(Effect.forkScoped);
          yield* TestClock.adjust("30 seconds");
        }).pipe(Effect.scoped, Effect.provide(TestClock.layer())),
      );

      expect(permissions.lookups()).toBe(lookups);
      expect(target.closes).toEqual([1013]);
      expect(hub.getLocalSockets()).toEqual([]);
    },
  );

  test("rebalances permissions and disconnects sessions with no organizations", async () => {
    const { handler, guilds, hub, activity, presence } = makeCommandHandler();
    const target = makeTestSocket(makeSession({ guilds: [guild()] }));
    hub.sockets.push(target.socket);
    guilds.guilds = [];
    await Effect.runPromise(handler.rebalanceUser("discord-1", "user-1"));
    expect(activity.calls).toEqual([
      { type: "DISCONNECT_EVENT", ids: ["organization-1"] },
    ]);
    expect(target.closes).toEqual([1008]);
    expect(presence.reconciled).toEqual([target.socket]);
    expect(hub.events).toHaveLength(1);
  });

  test.each([
    ["an unparsable frame while overloaded", "{", true],
    [
      "an unknown command",
      JSON.stringify({ v: 1, type: "rooms.join-raw", data: {} }),
      false,
    ],
    [
      "an escaped __proto__ key",
      '{"v":1,"type":"map-ping.send","requestId":"proto","data":{"expectedMapId":7,"type":"enemy","x":1,"y":1,"\\u005f_proto__":{"hidden":true}}}',
      false,
    ],
  ] as const)(
    "closes %s as a malformed protocol frame without a response",
    async (_name, frame, overloaded) => {
      const { handler, hub } = makeCommandHandler();
      const target = newSocket();

      if (overloaded) handler.rejectOverloaded(target.socket, frame);
      else await Effect.runPromise(handler.handle(target.socket, frame));

      expect(target.closes).toEqual([1007]);
      expect(hub.responses).toEqual([]);
    },
  );

  test("answers an invalid map ping with an invalid-payload acknowledgement instead of closing", async () => {
    const { send, hub } = makeCommandHandler();
    const target = newSocket();
    await send(
      target.socket,
      {
        type: "map-ping.send",
        data: { expectedMapId: 7, type: "enemy", x: -1, y: 1 },
      },
      "request-invalid",
    );
    expect(target.closes).toEqual([]);
    expect(hub.responses).toContainEqual({
      v: 1,
      requestId: "request-invalid",
      status: "success",
      data: { status: "rejected", code: "invalid-payload" },
    });
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

    // The Game client rejects any reply that fails this decoder.
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
            let event: typeof ServerEvent.Type;

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

  // The session is joined in the key's Lootlog, so only the API key guard rejects.
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
