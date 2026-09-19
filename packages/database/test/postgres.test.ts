import { expect, test } from "bun:test";
import { createServer, type AddressInfo, type Socket } from "node:net";
import { ManagedRuntime } from "effect";
import { SqlError } from "effect/unstable/sql/SqlError";
import { PgClient } from "@effect/sql-pg";
import { makePostgresLayer } from "../src/postgres.js";

test("fails startup with the original driver error when PostgreSQL is unavailable", async () => {
  const runtime = ManagedRuntime.make(
    makePostgresLayer({
      host: "127.0.0.1",
      port: 1,
      // Allow the driver to report refusal before the startup deadline on busy CI runners.
      connectTimeout: "2 seconds",
    }),
  );

  try {
    const startup = runtime.runPromise(PgClient.PgClient);
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

  const closed = Promise.withResolvers<void>();

  const server = createServer((socket) => {
    sockets.add(socket);
    socket.resume();
    socket.on("close", () => {
      sockets.delete(socket);
      closed.resolve();
    });
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
    await expect(runtime.runPromise(PgClient.PgClient)).rejects.toBeInstanceOf(
      SqlError,
    );
    await runtime.dispose();
    await Promise.race([closed.promise, Bun.sleep(1000)]);
    expect(sockets.size).toBe(0);
  } finally {
    await runtime.dispose();

    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
