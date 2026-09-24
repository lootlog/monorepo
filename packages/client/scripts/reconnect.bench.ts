/** Real WebSocket fixture; no application, auth service or Redis is started. */
import { RealtimeClient } from "../src/realtime/realtime-client.js";
import { decodeClientCommand } from "@lootlog/protocol/realtime";
import {
  decodeRealtimeFrame,
  encodeRealtimeFrame,
} from "@lootlog/protocol/realtime/codec";

const count = Number(process.env.RECONNECT_CLIENTS ?? 5_100);

if (!Number.isInteger(count) || count < 1 || count > 10_000)
  throw new Error("RECONNECT_CLIENTS must be 1..10000");

const Client: typeof RealtimeClient = process.env.RECONNECT_CLIENT_MODULE
  ? (await import(process.env.RECONNECT_CLIENT_MODULE)).RealtimeClient
  : RealtimeClient;

const deferredProvider = process.env.RECONNECT_STARTUP === "deferred";

const providerOwnsJoin = process.env.RECONNECT_PROVIDER_OWNS_JOIN !== "0";

const clients: RealtimeClient[] = [];

const sockets = new Set<Bun.ServerWebSocket<{ id: number }>>();

const counts = {
  upgrades: 0,
  joins: 0,
  subscriptions: 0,
  publications: 0,
  heartbeatFailures: 0,
  heartbeatSuccesses: 0,
};

let faultSockets = new Set<Bun.ServerWebSocket<{ id: number }>>();

let serial = 0;

let jitterStart: number | undefined;

const reconnectBuckets = new Map<number, number>();

const startedAt = performance.now();

const cpu = process.cpuUsage();

const server = Bun.serve<{ id: number }>({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request, target) {
    if (target.upgrade(request, { data: { id: ++serial } })) {
      counts.upgrades++;

      if (jitterStart !== undefined) {
        const bucket = Math.floor((performance.now() - jitterStart) / 100);
        reconnectBuckets.set(bucket, (reconnectBuckets.get(bucket) ?? 0) + 1);
      }

      return;
    }

    return new Response("upgrade required", { status: 400 });
  },
  websocket: {
    idleTimeout: 70,
    open(socket) {
      sockets.add(socket);
    },
    close(socket) {
      sockets.delete(socket);
    },
    message(socket, bytes) {
      const command =
        bytes instanceof Uint8Array
          ? decodeRealtimeFrame(bytes)
          : decodeClientCommand(JSON.parse(bytes));

      if (
        !("type" in command) ||
        !("requestId" in command) ||
        !command.requestId
      )
        throw new Error("Expected command");

      let data:
        | { organizationIds: string[] }
        | { sessionId: string }
        | undefined;

      switch (command.type) {
        case "session.join":
          counts.joins++;
          data = { organizationIds: ["fixture"] };
          break;
        case "subscription.subscribe":
          counts.subscriptions++;
          break;
        case "presence.publish":
          counts.publications++;
          data = { sessionId: String(socket.data.id) };
          break;
        case "presence.heartbeat":
          if (faultSockets.delete(socket)) {
            counts.heartbeatFailures++;
            socket.send(
              encodeRealtimeFrame({
                v: 1,
                requestId: command.requestId,
                status: "error",
                error: {
                  code: "COMMAND_REJECTED",
                  message: "fixture transient dependency failure",
                  retryable: true,
                },
              }),
            );

            return;
          }

          counts.heartbeatSuccesses++;
          break;
        default:
          throw new Error(`Unexpected fixture command: ${command.type}`);
      }

      socket.send(
        encodeRealtimeFrame({
          v: 1,
          requestId: command.requestId,
          status: "success",
          data,
        }),
      );
    },
  },
});

const waitFor = async (condition: () => boolean, timeout: number) => {
  const deadline = performance.now() + timeout;

  while (!condition()) {
    if (performance.now() > deadline)
      throw new Error(`Fixture deadline exceeded: ${JSON.stringify(counts)}`);
    await Bun.sleep(10);
  }
};

try {
  for (let index = 0; index < count; index++) {
    let randomState = index + 1;

    const client = new Client({
      url: server.url.toString(),
      random: () => {
        randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;

        return randomState / 2 ** 32;
      },
    });

    const restore = async () => {
      await client.join({ world: "fixture" });
      await client.request("presence.publish", {
        organizationIds: ["fixture"],
      });
    };

    client.setReconnectHandler(
      deferredProvider && providerOwnsJoin ? async () => {} : restore,
    );
    let initial = true;
    client.subscribeState((state) => {
      if (state !== "connected") return;

      if (deferredProvider) {
        queueMicrotask(() => {
          void restore();
        });
      } else if (initial) {
        initial = false;
        void restore();
      }
    });
    clients.push(client);
    void client.subscribeScope({
      topic: "organization.presence",
      organizationId: "fixture",
    });
    client.connect();

    if (index % 100 === 99) await Bun.sleep(1);
  }

  await waitFor(
    () =>
      counts.publications >= count &&
      clients.every((client) => client.state === "ready"),
    20_000,
  );

  if (sockets.size !== count)
    throw new Error("Not all fixture sockets are concurrent");
  await Bun.sleep(50);
  const initial = { ...counts };
  faultSockets = new Set(sockets);
  await waitFor(
    () =>
      counts.heartbeatFailures === count &&
      (counts.heartbeatSuccesses >= count ||
        (counts.upgrades === count * 2 &&
          counts.publications >= initial.publications + count &&
          clients.every((client) => client.state === "ready") &&
          sockets.size === count)),
    50_000,
  );
  await Bun.sleep(50);
  const transient = { ...counts };
  jitterStart = performance.now();
  const upgradesBefore = counts.upgrades;

  for (const socket of sockets) socket.close(1001, "fixture network restart");
  await waitFor(
    () =>
      counts.upgrades === upgradesBefore + count &&
      clients.every((client) => client.state === "ready"),
    20_000,
  );
  const usage = process.cpuUsage(cpu);
  console.log(
    JSON.stringify(
      {
        startupMode: deferredProvider
          ? "deferred-provider"
          : "synchronous-observer",
        providerOwnsJoin,
        clients: count,
        concurrentSockets: sockets.size,
        initial,
        afterTransientFailure: transient,
        afterNetworkRestart: counts,
        reconnect100msBuckets: Object.fromEntries(reconnectBuckets),
        elapsedMs: Math.round(performance.now() - startedAt),
        cpuMs: (usage.user + usage.system) / 1_000,
      },
      null,
      2,
    ),
  );
} finally {
  for (const client of clients) client.disconnect();
  server.stop(true);
}
