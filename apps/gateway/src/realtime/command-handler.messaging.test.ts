import { describe, expect, test } from "bun:test";
import { Effect, Metric, Predicate } from "effect";
import type { ClientCommand } from "@lootlog/protocol/realtime";
import { decodeCommandSuccess } from "@lootlog/protocol/realtime/codec";
import { createGatewayWebSocket } from "#src/app";
import type { AirTagService } from "#src/realtime/air-tag-service";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import type { SessionData } from "#src/realtime/session";
import { CommandAdmission } from "./command-admission.js";
import { CommandIngress } from "./command-ingress.js";
import {
  commandFrame,
  makeSession,
  makeTestSocket,
  newSocket,
  subscribedFederationStore,
  unusedFederationStore,
  withApiKey,
} from "../../test/realtime-fixtures.js";
import {
  guild,
  makeCommandHandler,
  unexpectedFeatures,
} from "../../test/command-handler-fixtures.js";

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

describe("CommandHandler messaging and subscriptions", () => {
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
              { targetId: "7", nickname: "Wróg", relation: 6, x: 1, y: 1 },
            ],
          },
        },
        requestId,
      );

    const running = observe("running");

    while (merges === 0) await Bun.sleep(1);
    await observe("concurrent");
    stalled.resolve();
    await running;
    await observe("admitted");
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

    expect(hub.responses.map((r) => JSON.parse(JSON.stringify(r)))).toEqual([
      { v: 1, requestId: "game-ping", status: "success", data: {} },
      { v: 1, requestId: "integration-ping", status: "success", data: {} },
    ]);
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
