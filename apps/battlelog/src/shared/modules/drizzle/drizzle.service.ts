import { PgClient } from "@effect/sql-pg";
import { sql } from "drizzle-orm";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { Effect, ManagedRuntime, Redacted } from "effect";
import { Logger } from "#src/platform/logger";
import { relations } from "./relations.js";

type BattlelogDatabase = Effect.Success<
  ReturnType<typeof makeWithDefaults<typeof relations>>
>;

export const makeDrizzleDatabase = (connectionString: string) => {
  const logger = new Logger("DrizzleDatabase");
  const runtime = ManagedRuntime.make(
    PgClient.layer({
      url: Redacted.make(connectionString),
      applicationName: "battlelog-service",
    }),
  );
  let database: BattlelogDatabase | null = null;

  const db = (): BattlelogDatabase => {
    if (!database) {
      throw new Error("Battlelog database was used before connect()");
    }

    return database;
  };

  const run = <A, E>(effect: Effect.Effect<A, E>): Promise<A> =>
    runtime.runPromise(effect);

  const connect = async (): Promise<void> => {
    try {
      database = await runtime.runPromise(makeWithDefaults({ relations }));
      await run(database.execute<{ id: number }>(sql`select 1 as id`));
      logger.log("Database connection established");
    } catch (error) {
      logger.error("Failed to connect to database", error);
      throw error;
    }
  };

  const close = async (): Promise<void> => {
    database = null;
    await runtime.dispose();
  };

  return {
    close,
    connect,
    get db() {
      return db();
    },
    run,
  };
};

export type DrizzleDatabase = ReturnType<typeof makeDrizzleDatabase>;
