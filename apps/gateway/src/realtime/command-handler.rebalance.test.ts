import { describe, expect, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { Effect, Exit, Fiber } from "effect";
import { TestClock } from "effect/testing";
import { GuildStoreFailure, type GuildStore } from "#src/guilds/guild-store";
import type { FederatedRealtimeMessage } from "#src/platform/redis-store";
import { RealtimeHub } from "#src/realtime/realtime-hub";
import {
  makeFederationBus,
  makeSession,
  makeTestSocket,
  newSocket,
  unavailablePermissions,
  unusedFederationStore,
} from "../../test/realtime-fixtures.js";
import {
  FakePresence,
  guild,
  makeCommandHandler,
} from "../../test/command-handler-fixtures.js";

describe("CommandHandler rebalance", () => {
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

      for (const { hub } of [local, remote]) await Effect.runPromise(hub.start);

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
      await Effect.runPromise(hub.start);
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
});
