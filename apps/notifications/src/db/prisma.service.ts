import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../../prisma/generated/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  private readonly slowQueryThresholdMs = 100;

  constructor() {
    const connectionString =
      process.env.NOTIFICATIONS_POSTGRESQL_CONNECTION_URI ??
      process.env.POSTGRESQL_CONNECTION_URI;

    if (!connectionString) {
      throw new Error(
        "Missing database connection string: NOTIFICATIONS_POSTGRESQL_CONNECTION_URI or POSTGRESQL_CONNECTION_URI",
      );
    }

    const pool = new PrismaPg({
      connectionString,
    });

    super({
      adapter: pool,
      log: [
        { emit: "event", level: "query" },
        { emit: "stdout", level: "error" },
        { emit: "stdout", level: "warn" },
      ],
    });

    this.$on("query", (event: Prisma.QueryEvent) => {
      if (event.duration >= this.slowQueryThresholdMs) {
        this.logger.warn(
          `Slow query (${event.duration} ms): ${event.query} params: ${event.params}`,
        );
      }
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
