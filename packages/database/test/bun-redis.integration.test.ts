import { afterAll, beforeAll, expect, it } from "bun:test";
import type { Socket, TCPSocketListener } from "bun";
import { Effect, ManagedRuntime } from "effect";
import { Redis } from "effect/persistence";
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { reconnectingBunRedisLayer } from "../src/bun-redis.js";

interface ProxySocketData {
  upstream?: Socket<undefined>;
  pending: Array<Uint8Array>;
}

const startProxy = (upstreamHost: string, upstreamPort: number) => {
  let silent = false;

  const sockets = new Set<Socket<ProxySocketData>>();

  const listener: TCPSocketListener<ProxySocketData> =
    Bun.listen<ProxySocketData>({
      hostname: "127.0.0.1",
      port: 0,
      socket: {
        async open(socket) {
          socket.data = { pending: [] };

          sockets.add(socket);

          if (silent) return;

          const upstream = await Bun.connect({
            hostname: upstreamHost,
            port: upstreamPort,
            socket: {
              data: (_upstream, data) => void socket.write(data),
              close: () => void socket.end(),
              error: () => void socket.end(),
            },
          });

          socket.data.upstream = upstream;

          for (const data of socket.data.pending) upstream.write(data);
        },
        data(socket, data) {
          if (socket.data.upstream) socket.data.upstream.write(data);
          else if (!silent) socket.data.pending.push(new Uint8Array(data));
        },
        close(socket) {
          sockets.delete(socket);

          socket.data.upstream?.end();
        },
      },
    });

  return {
    port: listener.port,
    setSilent(value: boolean) {
      silent = value;

      for (const socket of sockets) {
        socket.data.upstream?.end();
        socket.end();
      }
    },
    stop: () => listener.stop(true),
  };
};

let redis: StartedTestContainer;

beforeAll(async () => {
  redis = await new GenericContainer("redis:7-alpine")
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();
}, 60_000);

afterAll(async () => {
  await redis?.stop();
});

it("serves commands again after a reconnect attempt times out", async () => {
  const proxy = startProxy(redis.getHost(), redis.getMappedPort(6379));

  const runtime = ManagedRuntime.make(
    reconnectingBunRedisLayer({
      url: `redis://127.0.0.1:${proxy.port}`,
      connectionTimeout: 300,
    }),
  );

  const ping = () =>
    runtime.runPromise(
      Effect.flatMap(Redis.Redis, (client) => client.send("PING")),
    );

  try {
    expect(await ping()).toBe("PONG");

    proxy.setSilent(true);

    await Bun.sleep(1_000);

    proxy.setSilent(false);

    let reply: unknown;

    for (let attempt = 0; attempt < 40 && reply !== "PONG"; attempt++) {
      reply = await ping().catch(() => undefined);

      if (reply !== "PONG") await Bun.sleep(100);
    }

    expect(reply).toBe("PONG");
  } finally {
    await runtime.dispose();

    proxy.stop();
  }
}, 20_000);
