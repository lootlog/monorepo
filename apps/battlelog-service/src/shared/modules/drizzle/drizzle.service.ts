import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import type { Logger } from "winston";
import { relations } from "./relations.js";

export class DrizzleService {
  private readonly pool: pg.Pool;
  public readonly db;

  constructor(
    connectionString: string,
    private readonly winstonLogger: Logger,
  ) {
    this.pool = new pg.Pool({ connectionString });
    this.pool.on("error", (error) => {
      this.winstonLogger.error("Unexpected idle PostgreSQL client error", {
        error: error.stack,
      });
    });
    this.db = drizzle({ client: this.pool, relations });
  }

  async connect() {
    try {
      const client = await this.pool.connect();
      client.release();
      this.winstonLogger.info("Database connection established");
    } catch (error) {
      this.winstonLogger.error("Failed to connect to database", { error });
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}
