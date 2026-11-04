import { PgClient } from "@effect/sql-pg";
import { Context, Effect, Layer, Metric, Schedule } from "effect";
import { Reactivity } from "effect/reactivity";
import { SqlClient } from "effect/sql";
import { ConnectionError, SqlError } from "effect/sql/SqlError";

// OpenTelemetry database client connection metrics, sampled from the pool.
const connectionCount = Metric.gauge("db.client.connection.count", {
  description: "PostgreSQL pool connections by state",
  attributes: { unit: "" },
});

const pendingRequests = Metric.gauge("db.client.connection.pending_requests", {
  description: "Checkouts waiting for a PostgreSQL pool connection",
  attributes: { unit: "" },
});

const connectionMax = Metric.gauge("db.client.connection.max", {
  description: "Maximum PostgreSQL pool connections",
  attributes: { unit: "" },
});

const recordPoolStats = (client: PgClient.PgClient) =>
  Effect.gen(function* () {
    const stats = yield* client.poolStats;
    yield* Metric.update(
      Metric.withAttributes(connectionCount, {
        "db.client.connection.state": "idle",
      }),
      stats.idle,
    );
    yield* Metric.update(
      Metric.withAttributes(connectionCount, {
        "db.client.connection.state": "used",
      }),
      stats.used,
    );
    yield* Metric.update(pendingRequests, stats.pending);
    yield* Metric.update(connectionMax, stats.max);
  });

export const makePostgresLayer = (options: PgClient.PgPoolConfig) =>
  Layer.effectContext(
    Effect.gen(function* () {
      const client = yield* PgClient.make({
        // A connection that silently stops responding fails its queries
        // instead of leaving them hanging.
        keepAlive: "30 seconds",
        // An exhausted pool fails checkouts so callers see the outage and
        // retry, instead of queueing requests without bound.
        acquireTimeout: "10 seconds",
        ...options,
      });

      yield* client`SELECT 1`.pipe(
        Effect.timeoutOrElse({
          duration: options.connectTimeout ?? "5 seconds",
          orElse: () =>
            Effect.fail(
              new SqlError({
                reason: new ConnectionError({
                  cause: new Error("Connection timed out"),
                  message: "PostgreSQL connection timed out",
                  operation: "connect",
                }),
              }),
            ),
        }),
      );

      yield* recordPoolStats(client).pipe(
        Effect.repeat(Schedule.spaced("10 seconds")),
        Effect.forkScoped,
      );

      return Context.make(PgClient.PgClient, client).pipe(
        Context.add(SqlClient.SqlClient, client),
      );
    }),
  ).pipe(Layer.provide(Reactivity.layer));
