import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import pg from "pg";

import { relations } from "./relations";

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DrizzleService.name);
  private pool: pg.Pool;
  public db;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly winstonLogger: Logger,
  ) {
    this.pool = new pg.Pool({
      connectionString: process.env.POSTGRESQL_CONNECTION_URI,
    });
    this.db = drizzle({ client: this.pool, relations });
  }

  async onModuleInit() {
    try {
      const client = await this.pool.connect();
      client.release();
      this.logger.log("Database connection established");
    } catch (error) {
      this.winstonLogger.log(
        "error",
        `Failed to connect to database: ${error}`,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
