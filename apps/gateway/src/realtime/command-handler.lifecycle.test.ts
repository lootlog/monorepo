import { RpcUnavailableError } from "@lootlog/rpc/errors";
import { describe, expect, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Exit, Predicate } from "effect";
import { decodeServerEvent } from "@lootlog/protocol/realtime";
import type { MargonemAccountVerifiedV1 } from "@lootlog/protocol/rabbit/events";
import { GuildStoreFailure, makeGuildStore } from "#src/guilds/guild-store";
import { CommandAdmission } from "./command-admission.js";
import {
  captureSpans,
  commandFrame,
  join,
  makeSession,
  makeTestSocket,
  newSocket,
  onlinePresence,
  withApiKey,
} from "../../test/realtime-fixtures.js";
import { makeGuildStoreRedis } from "../../test/guild-store-fixtures.js";
import {
  guild,
  makeCommandHandler,
} from "../../test/command-handler-fixtures.js";

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

describe("CommandHandler session lifecycle", () => {
  test.each([false, true])(
    "permission API failure preserves cached client state during join (already joined: %s)",
    async (joined) => {
      const store = makeGuildStore(
        { apiRpcUrl: "http://api.local" },
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
      { apiRpcUrl: "http://api.local" },
      makeGuildStoreRedis({ discordId: "discord-1", userId: "user-1" }).store,
      {
        getUserGuildPermissions: () =>
          Effect.promise(async () => {
            requests++;
            await gate.promise;

            return [guild()];
          }),
      },
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
