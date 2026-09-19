import { PgClient } from "@effect/sql-pg";
import { Context, Effect, Layer } from "effect";
import { Reactivity } from "effect/unstable/reactivity";
import { SqlClient } from "effect/unstable/sql";
import { ConnectionError, SqlError } from "effect/unstable/sql/SqlError";

export const makePostgresLayer = (options: PgClient.PgPoolConfig) =>
  Layer.effectContext(
    Effect.gen(function* () {
      const client = yield* PgClient.make(options);

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

      return Context.make(PgClient.PgClient, client).pipe(
        Context.add(SqlClient.SqlClient, client),
      );
    }),
  ).pipe(Layer.provide(Reactivity.layer));
