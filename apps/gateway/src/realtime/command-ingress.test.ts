import { expect, test } from "bun:test";
import { Effect, Metric } from "effect";
import { encode } from "@msgpack/msgpack";
import type { SubscriptionScope } from "@lootlog/protocol/realtime";
import { createGatewayWebSocket } from "#src/app";
import { RealtimeHub } from "./realtime-hub.js";
import { unusedFederationStore } from "../../test/realtime-fixtures.js";
import { CommandIngress } from "./command-ingress.js";
import type { GatewaySocket } from "./session.js";

const socket = (connectionId: string): GatewaySocket => ({
  data: {
    connectionId,
    discordId: "discord",
    userId: "user",
    platform: "web-app",
    joined: false,
    guilds: [],
    subscriptions: new Map(),
    airTagScopes: [],
    confidence: "reported",
    backpressureStrikes: 0,
  },
  send: () => 1,
  close: () => undefined,
  getBufferedAmount: () => 0,
});

test.each(["json", "msgpack"] as const)(
  "default admission permits restoring 4096 large valid subscriptions using %s",
  async (encoding) => {
    const tasks: Array<Effect.Effect<void, unknown>> = [];
    let rejected = 0;
    let completed = 0;

    const ingress = new CommandIngress(
      () =>
        Effect.sync(() => {
          completed++;
        }),
      () => {
        rejected++;
      },
      () => Effect.void,
      (_label, task) => {
        tasks.push(task);
      },
    );

    const connection = socket("reconnect");
    ingress.open(connection);

    for (let index = 0; index < 4096; index++) {
      const scope = {
        topic: "map.pings",
        organizationId: "organization",
        world: "w".repeat(900),
        mapId: index,
      } satisfies SubscriptionScope;

      const frame = {
        v: 1,
        requestId: `restore-${index}`,
        type: "subscription.subscribe",
        data: scope,
      };

      ingress.message(
        connection,
        encoding === "json"
          ? JSON.stringify(frame)
          : Buffer.from(encode(frame)),
      );
    }

    expect(rejected).toBe(0);

    while (tasks.length > 0) {
      const task = tasks.shift();

      if (task) await Effect.runPromise(task);
    }

    expect(completed).toBe(4096);
    expect(ingress.getDiagnostics()).toMatchObject({ pending: 0, bytes: 0 });
  },
);

const setup = (
  limits: ConstructorParameters<typeof CommandIngress>[4] = {
    active: 2,
    messages: 4,
    bytes: 40,
    connectionMessages: 3,
    connectionBytes: 30,
  },
) => {
  const tasks: Array<Effect.Effect<void, unknown>> = [];
  const handled: string[] = [];
  const rejected: string[] = [];
  const closed: string[] = [];

  const ingress = new CommandIngress(
    (target, input) => {
      handled.push(`${target.data.connectionId}:${input}`);

      return input === "defect" ? Effect.die("dependency defect") : Effect.void;
    },
    (_target, input) => {
      rejected.push(String(input));
    },
    (target) =>
      Effect.sync(() => {
        closed.push(target.data.connectionId);
      }),
    (_label, task) => {
      tasks.push(task);
    },
    limits,
  );

  const runNext = async () => {
    const task = tasks.shift();

    if (!task) throw new Error("No scheduled task");

    return Effect.runPromiseExit(task);
  };

  return { ingress, tasks, handled, rejected, closed, runNext };
};

test("bounds retained commands before decoding and serializes each socket while letting another proceed", async () => {
  const target = setup();
  const first = socket("first");
  const second = socket("second");
  target.ingress.open(first);
  target.ingress.open(second);

  for (const input of ["one", "two", "three", "overflow"])
    target.ingress.message(first, input);
  target.ingress.message(second, "other");
  target.ingress.message(second, "global-overflow");
  expect(target.handled).toEqual([]);
  expect(target.tasks).toHaveLength(2);
  expect(target.rejected).toEqual(["overflow", "global-overflow"]);
  expect(target.ingress.getDiagnostics()).toMatchObject({
    active: 2,
    pending: 4,
    rejected: 2,
  });
  await target.runNext();
  await target.runNext();
  expect(target.handled).toEqual(["first:one", "second:other"]);
  await target.runNext();
  await target.runNext();
  expect(target.handled).toEqual([
    "first:one",
    "second:other",
    "first:two",
    "first:three",
  ]);
  expect(target.ingress.getDiagnostics()).toMatchObject({
    active: 0,
    pending: 0,
    bytes: 0,
  });
});

test("limits retained UTF-8 and binary bytes and makes reclaimed capacity available", async () => {
  const target = setup({
    active: 1,
    messages: 10,
    bytes: 8,
    connectionMessages: 10,
    connectionBytes: 6,
  });

  const first = socket("first");
  const second = socket("second");
  target.ingress.open(first);
  target.ingress.open(second);
  target.ingress.message(first, "ąąą");
  target.ingress.message(first, "a");
  target.ingress.message(second, Buffer.from("ab"));
  target.ingress.message(second, Buffer.from("c"));
  expect(target.rejected).toEqual(["a", "c"]);
  expect(target.ingress.getDiagnostics()).toMatchObject({
    bytes: 8,
    pending: 2,
  });
  await target.runNext();
  target.ingress.message(first, "next");
  await target.runNext();
  await target.runNext();
  expect(target.handled).toEqual(["first:ąąą", "second:ab", "first:next"]);
  expect(target.ingress.getDiagnostics().bytes).toBe(0);
});

test("drains accepted commands before one disconnect cleanup, including after a defect", async () => {
  const target = setup();
  const connection = socket("first");
  target.ingress.open(connection);
  target.ingress.message(connection, "defect");
  target.ingress.message(connection, "accepted");
  target.ingress.close(connection);
  target.ingress.close(connection);
  target.ingress.message(connection, "after-close");
  await target.runNext();
  expect(target.closed).toEqual([]);
  await target.runNext();
  expect(target.closed).toEqual([]);
  await target.runNext();
  expect(target.handled).toEqual(["first:defect", "first:accepted"]);
  expect(target.closed).toEqual(["first"]);
  expect(target.tasks).toHaveLength(0);
  expect(target.ingress.getDiagnostics()).toMatchObject({
    active: 0,
    pending: 0,
    bytes: 0,
  });
});

test("gives another queued connection a turn while disconnect cleanup proceeds independently", async () => {
  const target = setup({
    active: 1,
    messages: 10,
    bytes: 100,
    connectionMessages: 10,
    connectionBytes: 100,
  });

  const first = socket("first");
  const second = socket("second");
  const third = socket("third");

  for (const connection of [first, second, third])
    target.ingress.open(connection);
  target.ingress.message(first, "one");
  target.ingress.message(first, "two");
  target.ingress.message(second, "other");
  target.ingress.close(third);
  expect(target.tasks).toHaveLength(2);
  await target.runNext();
  await target.runNext();
  expect(target.closed).toEqual(["third"]);
  await target.runNext();
  expect(target.handled).toEqual(["first:one", "second:other"]);
  await target.runNext();
  expect(target.handled).toEqual(["first:one", "second:other", "first:two"]);
});

test("lets a host callback run while a synchronous command burst is draining", async () => {
  let handled = 0;
  const drained = Promise.withResolvers<void>();

  const ingress = new CommandIngress(
    () =>
      Effect.sync(() => {
        handled += 1;

        if (handled === 100) drained.resolve();
      }),
    () => {
      throw new Error("Unexpected overload");
    },
    () => Effect.void,
    (_label, task) => {
      void Effect.runPromise(task).catch(drained.reject);
    },
  );

  const connection = socket("first");
  ingress.open(connection);

  for (let index = 0; index < 100; index += 1)
    ingress.message(connection, "command");

  const handledAtHostCallback = await new Promise<number>((resolve) => {
    setImmediate(() => resolve(handled));
  });

  expect(handledAtHostCallback).toBeLessThan(100);
  await drained.promise;
  expect(handled).toBe(100);
});

test("disconnect cleanup progresses while every command slot remains occupied", async () => {
  const target = setup({
    active: 1,
    messages: 10,
    bytes: 100,
    connectionMessages: 10,
    connectionBytes: 100,
  });

  const busy = socket("busy");
  const closing = socket("closing");
  target.ingress.open(busy);
  target.ingress.open(closing);
  target.ingress.message(busy, "stalled");
  target.ingress.close(closing);
  // Leave the first task suspended, exactly like a stalled dependency.
  const cleanup = target.tasks[1];
  expect(cleanup).toBeDefined();

  if (cleanup) await Effect.runPromise(cleanup);
  expect(target.closed).toEqual(["closing"]);
  expect(target.handled).toEqual([]);
  expect(target.ingress.getDiagnostics().active).toBe(1);
});

test("bounds lifecycle retention when cleanup stalls and admits reconnects after cleanup recovers", async () => {
  const target = setup({
    active: 1,
    cleanupActive: 1,
    connections: 3,
    messages: 10,
    bytes: 100,
    connectionMessages: 10,
    connectionBytes: 100,
  });

  const busy = socket("busy");
  const first = socket("first");
  const second = socket("second");

  for (const connection of [busy, first, second])
    expect(target.ingress.open(connection)).toBe(true);
  target.ingress.message(busy, "stalled");
  target.ingress.close(first);
  target.ingress.close(second);

  for (let index = 0; index < 100; index++)
    expect(target.ingress.open(socket(`overflow-${index}`))).toBe(false);
  expect(target.tasks).toHaveLength(2);
  expect(target.ingress.getDiagnostics()).toMatchObject({
    active: 1,
    cleanupActive: 1,
    closingConnections: 2,
    retainedConnections: 3,
  });
  const cleanup = target.tasks[1];

  if (!cleanup) throw new Error("Missing reserved cleanup task");
  await Effect.runPromise(cleanup);
  expect(target.closed).toEqual(["first"]);
  expect(target.ingress.open(socket("reconnected"))).toBe(true);
});

test("queued commands on closed sockets cannot consume reserved disconnect capacity", async () => {
  const target = setup({
    active: 1,
    cleanupActive: 1,
    messages: 10,
    bytes: 100,
    connectionMessages: 10,
    connectionBytes: 100,
  });

  const busy = socket("busy");
  const closing = socket("closing");
  const idle = socket("idle");
  target.ingress.open(busy);
  target.ingress.open(closing);
  target.ingress.open(idle);
  target.ingress.message(busy, "stalled");
  target.ingress.message(closing, "first");
  target.ingress.message(closing, "second");
  target.ingress.close(closing);
  target.ingress.close(idle);
  const cleanup = target.tasks.splice(1, 1)[0];

  if (!cleanup) throw new Error("Missing reserved cleanup task");
  await Effect.runPromise(cleanup);
  expect(target.closed).toEqual(["idle"]);
  expect(target.handled).toEqual([]);
  // Only resume command work after proving that independent cleanup progressed.
  await target.runNext();
  await target.runNext();
  await target.runNext();
  expect(target.handled).toEqual([
    "busy:stalled",
    "closing:first",
    "closing:second",
  ]);
  expect(target.closed).toEqual(["idle"]);
  await target.runNext();
  expect(target.closed).toEqual(["idle", "closing"]);
  expect(target.ingress.getDiagnostics()).toMatchObject({
    active: 0,
    cleanupActive: 0,
    pending: 0,
  });
});

test("WebSocket close removes delivery targets immediately and rejects excess lifecycles before registration", async () => {
  const writes: string[] = [];

  const hub = new RealtimeHub(
    { maxBackpressureBytes: 1024, maxBackpressureStrikes: 3 },
    {
      ...unusedFederationStore,
      command: {
        ...unusedFederationStore.command,
        set: async (key) => {
          writes.push(key);

          return "OK";
        },
        sadd: async () => 1,
        expire: async () => 1,
      },
    },
    () => {},
  );

  const target = setup({
    active: 1,
    connections: 1,
    messages: 10,
    bytes: 100,
    connectionMessages: 10,
    connectionBytes: 100,
  });

  const transport = createGatewayWebSocket({ hub, ingress: target.ingress });
  const first = socket("first");
  const closes: number[] = [];

  const excess: GatewaySocket = {
    ...socket("excess"),
    close: (code) => {
      closes.push(code ?? 1000);
      // Bun can deliver close synchronously while the open callback rejects it.
      transport.close(excess, code);
    },
  };

  transport.open(first);
  transport.message(first, "stalled");
  transport.close(first);
  expect(hub.getLocalSockets()).toEqual([]);
  expect(hub.getLocalSocketsForUser(first.data.userId)).toEqual([]);
  const beforeRejection = Effect.runSync(Metric.snapshot);
  transport.open(excess);
  expect(closes).toEqual([1013]);
  expect(Effect.runSync(Metric.snapshot)).toEqual(beforeRejection);
  expect(target.ingress.getDiagnostics().rejectedConnections).toBe(1);
  expect(writes).toEqual(["realtime:connection:first"]);
  await target.runNext();
  await target.runNext();
  transport.open(excess);
  expect(hub.getLocalSockets()).toEqual([excess]);
});
