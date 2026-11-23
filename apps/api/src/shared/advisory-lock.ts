import { sql, type SQL } from "drizzle-orm";
import { Effect, Schema } from "effect";

const decodeLockResult = Schema.decodeUnknownEffect(
  Schema.Struct({
    rows: Schema.Tuple([Schema.Struct({ acquired: Schema.Boolean })]),
  }),
);

export const tryAdvisoryTransactionLock = <E>(
  transaction: { readonly execute: (query: SQL) => Effect.Effect<unknown, E> },
  key: number,
) =>
  transaction
    .execute(sql`select pg_try_advisory_xact_lock(${key}) as acquired`)
    .pipe(
      Effect.flatMap(decodeLockResult),
      Effect.map(({ rows: [{ acquired }] }) => acquired),
    );
