import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { PrismaClient, Prisma } from "generated/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  private readonly SLOW_QUERY_THRESHOLD_MS = 100;

  constructor() {
    super({
      log: [
        { emit: "event", level: "query" },
        { emit: "stdout", level: "info" },
        { emit: "stdout", level: "warn" },
        { emit: "stdout", level: "error" },
      ],
      errorFormat: "colorless",
    });

    this.$on("query", (event: Prisma.QueryEvent) => {
      const { duration, query, params, target } = event;

      if (duration >= this.SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn(
          `Slow query (${duration} ms) [${target}]:
          ${query}
          params: ${params}`,
        );
      } else {
        // this.logger.debug(`Query (${duration} ms) [${target}]`);
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
