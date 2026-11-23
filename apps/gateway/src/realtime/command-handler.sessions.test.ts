import { httpClientFromResponses } from "../../test/http-fixtures.js";
import { makeGuildStoreRedis } from "../../test/guild-store-fixtures.js";
import { describe, expect, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Predicate } from "effect";
import { CommandAdmission } from "./command-admission.js";
import { decodeServerEvent } from "@lootlog/protocol/realtime";
import { GuildStoreFailure, makeGuildStore } from "#src/guilds/guild-store";
import {
  commandFrame,
  makeSession,
  makeTestSocket,
  withApiKey,
  newSocket,
} from "../../test/realtime-fixtures.js";
import {
  guild,
  makeCommandHandler,
  unexpectedFeatures,
  onlinePresence,
  join,
} from "../../test/command-handler-fixtures.js";

describe("CommandHandler session lifecycle", () => {
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
    expect(activity.calls).toEqual([]);
    expect(hub.responses).toContainEqual(
      expect.objectContaining({ requestId: "request-1", status: "success" }),
    );
  });

  test("a re-join whose permission read fails keeps the joined character and confidence", async () => {
    let guildsUnavailable = false;

    const { send, guilds } = makeCommandHandler({
      verifier: { verify: () => Effect.succeed({ valid: true }) },
    });

    const readGuilds = guilds.getUserGuilds;
    guilds.getUserGuilds = (...args) =>
      guildsUnavailable
        ? Effect.fail(
            new GuildStoreFailure({ reason: "transport", retryable: true }),
          )
        : readGuilds(...args);

    const character = (characterId: string) => ({
      world: "alpha",
      name: `Hero ${characterId}`,
      lvl: 100,
      icon: "hero.gif",
      characterId,
      accountId: "20",
      prof: "w",
    });

    const { socket } = newSocket({ platform: "game" });
    await send(socket, {
      type: "session.join",
      data: {
        world: "alpha",
        character: character("10"),
        margonemAccountProof: {},
      },
    });

    guildsUnavailable = true;
    await send(
      socket,
      {
        type: "session.join",
        data: { world: "alpha", character: character("11") },
      },
      "rejoin",
    );

    expect(socket.data.joined).toBe(true);
    expect(socket.data.character?.characterId).toBe("10");
    expect(socket.data.confidence).toBe("verified");
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
    await joinFresh("concurrent");
    gate.resolve();
    await running;
    await joinFresh("admitted");
    await joinFresh("drained");
    now = 1_000;
    await joinFresh("refilled");

    const busy = {
      error: {
        code: "COMMAND_REJECTED",
        reason: "gateway-busy",
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
            reason: "no-authorized-organizations",
            message: "no authorized organizations",
            retryable: false,
          },
        },
      ]);
      expect(target.socket.data.guilds).toEqual([]);
      expect(target.socket.data.joined).toBe(false);
      expect(target.socket.data.subscriptions.size).toBe(0);
      expect(target.socket.data.airTagScopes).toEqual([]);
      expect(target.socket.data.presence).toBeUndefined();
      expect(presence.reconciled).toEqual([target.socket]);
      expect(activity.calls).toEqual(
        previouslyJoined
          ? [{ type: "DISCONNECT_EVENT", ids: ["organization-1"] }]
          : [],
      );
    },
  );
});
