import { expect, test } from "bun:test";
import type { Socket } from "bun";
import { ManagedRuntime } from "effect";
import { SqlError } from "effect/sql/SqlError";
import { PgClient } from "@effect/sql-pg";
import { makePostgresLayer } from "../src/postgres.js";

test("fails startup with the original driver error when PostgreSQL is unavailable", async () => {
  const runtime = ManagedRuntime.make(
    makePostgresLayer({
      host: "127.0.0.1",
      port: 1,
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

  const server = Bun.listen({
    hostname: "127.0.0.1",
    port: 0,
    socket: {
      open: (socket) => {
        sockets.add(socket);
      },
      data: () => {},
      close: (socket) => {
        sockets.delete(socket);
        closed.resolve();
      },
    },
  });

  const runtime = ManagedRuntime.make(
    makePostgresLayer({
      host: "127.0.0.1",
      port: server.port,
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

    server.stop(true);
  }
});
