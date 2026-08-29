import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger as WinstonLogger } from "winston";
import { db, drizzlePool } from "./drizzle.js";

@Injectable()
export class DrizzleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DrizzleService.name);
  public readonly db = db;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly winstonLogger: WinstonLogger,
  ) {}

  async onModuleInit() {
    drizzlePool.on("error", (error) => {
      this.winstonLogger.error(
        "Unexpected idle PostgreSQL client error",
        error.stack,
      );
    });

    try {
      const client = await drizzlePool.connect();
      client.release();
      this.logger.log("Database connection established");
    } catch (error) {
      this.winstonLogger.error(
        `Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    await drizzlePool.end();
  }
}
