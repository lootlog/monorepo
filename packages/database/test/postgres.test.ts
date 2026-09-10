import { expect, test } from "bun:test";
import { createServer, type AddressInfo, type Socket } from "node:net";
import { ManagedRuntime } from "effect";
import { SqlError } from "effect/unstable/sql/SqlError";
import { makePostgresLayer, PostgresPool } from "../src/postgres.js";

test("fails startup with the original driver error when PostgreSQL is unavailable", async () => {
  const runtime = ManagedRuntime.make(
    makePostgresLayer({
      host: "127.0.0.1",
      port: 1,
      connectTimeout: "100 millis",
    }),
  );

  try {
    const startup = runtime.runPromise(PostgresPool);
    await expect(startup).rejects.toBeInstanceOf(SqlError);
    await expect(startup).rejects.toMatchObject({
      reason: { cause: { code: "ECONNREFUSED" } },
    });
  } finally {
    await runtime.dispose();
  }
});

test("closes a stalled connection after startup times out", async () => {
  const sockets = new Set<Socket>();

  const server = createServer((socket) => {
    sockets.add(socket);
    socket.resume();
    socket.on("close", () => sockets.delete(socket));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  // SAFETY: the awaited listener binds an IPv4 TCP port, so address is neither
  // a Unix socket path nor null (the server has not been closed).
  const address = server.address() as AddressInfo;

  const runtime = ManagedRuntime.make(
    makePostgresLayer({
      host: "127.0.0.1",
      port: address.port,
      connectTimeout: "100 millis",
    }),
  );

  try {
    await expect(runtime.runPromise(PostgresPool)).rejects.toBeInstanceOf(
      SqlError,
    );
    await runtime.dispose();
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(sockets.size).toBe(0);
  } finally {
    await runtime.dispose();

    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
