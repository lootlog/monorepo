import {
  makeWithDefaults,
  type EffectPgQueryEffectHKT,
} from "drizzle-orm/effect-postgres";
import type { PgQueryResultHKT, PgRawRow } from "drizzle-orm/pg-core";
import type { PgEffectDatabase } from "drizzle-orm/pg-core/effect";
import { makePostgresLayer } from "@lootlog/database";
import { Effect, Layer } from "effect";
import { battlelogDatabaseConfig } from "#src/config/env";
import { relations } from "./relations.js";

export const drizzleDatabaseEffect = makeWithDefaults({ relations });

type QueryRows<Row> = { readonly rows: ReadonlyArray<Row> };

interface QueryRowsHKT extends PgQueryResultHKT {
  type: QueryRows<PgRawRow<this["row"]>>;
}

export type DrizzleDatabase = PgEffectDatabase<
  EffectPgQueryEffectHKT,
  QueryRowsHKT,
  typeof relations
>;

export const PgClientLive = Layer.unwrap(
  Effect.gen(function* () {
    const config = yield* battlelogDatabaseConfig;

    return makePostgresLayer({ ...config, maxConnections: 10 });
  }),
);
