import {
  Injectable,
  Logger,
  Optional,
  type OnModuleInit,
} from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "#src/generated/prisma/client";
import { env } from "#src/config/env";
import { PerfDiagnosticsService } from "#src/shared/diagnostics/perf-diagnostics.service";

const isDev = process.env.ENV === "local" || process.env.ENV === "dev";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  private readonly SLOW_QUERY_THRESHOLD_MS = 100;

  constructor(
    @Optional()
    private readonly perfDiagnosticsService?: PerfDiagnosticsService,
  ) {
    const connectionString = process.env.POSTGRESQL_CONNECTION_URI;
    if (!connectionString) {
      throw new Error("Missing POSTGRESQL_CONNECTION_URI");
    }

    const enableQueryEvents = isDev || env.PERF_DIAGNOSTICS_ENABLED;

    const adapter = new PrismaPg({
      connectionString,
      max: 20,
    });

    super({
      adapter,
      log: enableQueryEvents
        ? [
            { emit: "event", level: "query" },
            ...(isDev
              ? [{ emit: "stdout" as const, level: "info" as const }]
              : []),
            { emit: "stdout", level: "warn" },
            { emit: "stdout", level: "error" },
          ]
        : [
            { emit: "stdout", level: "warn" },
            { emit: "stdout", level: "error" },
          ],
      errorFormat: "colorless",
    });

    if (enableQueryEvents) {
      this.$on("query", (event: Prisma.QueryEvent) => {
        const { duration, query, params, target } = event;

        if (isDev && duration >= this.SLOW_QUERY_THRESHOLD_MS) {
          this.logger.warn(
            `Slow query (${duration} ms) [${target}]:
          ${query}
          params: ${params}`,
          );
        }

        if (!isDev) {
          this.perfDiagnosticsService?.logSpan("prisma.query", duration, {
            query: this.truncateQuery(query),
            target,
          });
        }
      });
    }
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private truncateQuery(query: string) {
    const normalized = query.replace(/\s+/g, " ").trim();

    if (normalized.length <= 2000) {
      return normalized;
    }

    return `${normalized.slice(0, 2000)}...`;
  }
}
