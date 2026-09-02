import { PgClient } from "@effect/sql-pg";
import { sql } from "drizzle-orm";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { Effect, ManagedRuntime, Redacted } from "effect";
import { Logger } from "#src/platform/logger";
import { relations } from "./relations.js";

type BattlelogDatabase = Effect.Success<
  ReturnType<typeof makeWithDefaults<typeof relations>>
>;

export class DrizzleService {
  private readonly logger = new Logger(DrizzleService.name);
  private readonly runtime;
  private database: BattlelogDatabase | null = null;

  constructor(connectionString: string) {
    this.runtime = ManagedRuntime.make(
      PgClient.layer({
        url: Redacted.make(connectionString),
        applicationName: "battlelog-service",
      }),
    );
  }

  get db(): BattlelogDatabase {
    if (!this.database) {
      throw new Error("Battlelog database was used before connect()");
    }

    return this.database;
  }

  async connect(): Promise<void> {
    try {
      this.database = await this.runtime.runPromise(
        makeWithDefaults({ relations }),
      );
      await this.run(
        this.database.execute<{ id: number }>(sql`select 1 as id`),
      );
      this.logger.log("Database connection established");
    } catch (error) {
      this.logger.error("Failed to connect to database", error);
      throw error;
    }
  }

  run<A, E>(effect: Effect.Effect<A, E>): Promise<A> {
    return this.runtime.runPromise(effect);
  }

  async close(): Promise<void> {
    this.database = null;
    await this.runtime.dispose();
  }
}
