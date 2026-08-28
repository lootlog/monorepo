import {
  createApiApplicationDatabase,
  normalizeApiDatabaseValue,
  type ApiApplicationDatabase,
} from "./application-client";
import { createApiDatabase, type ApiDatabaseMiddleware } from "./database";
import {
  Injectable,
  Logger,
  Optional,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { Pool } from "pg";
import { env } from "src/config/env";
import { PerfDiagnosticsService } from "src/shared/diagnostics/perf-diagnostics.service";

const SLOW_QUERY_THRESHOLD_MS = 100;
const MAX_QUERY_LOG_LENGTH = 2000;
const isDev = process.env.ENV === "local" || process.env.ENV === "dev";

function describePlan(plan: unknown): { query: string; params?: unknown } {
  if (!plan || typeof plan !== "object") {
    return { query: "unknown" };
  }

  const executionPlan = plan as { sql?: unknown; params?: unknown };
  return {
    query:
      typeof executionPlan.sql === "string" ? executionPlan.sql : "unknown",
    params: executionPlan.params,
  };
}

function truncateQuery(query: string): string {
  const normalized = query.replace(/\s+/g, " ").trim();
  return normalized.length <= MAX_QUERY_LOG_LENGTH
    ? normalized
    : `${normalized.slice(0, MAX_QUERY_LOG_LENGTH)}...`;
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly orm: ApiApplicationDatabase["orm"];
  readonly raw: ApiApplicationDatabase["raw"];
  readonly transaction: ApiApplicationDatabase["transaction"];

  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;
  private readonly nativeDatabase: ReturnType<typeof createApiDatabase>;
  private closePromise?: Promise<void>;

  constructor(
    @Optional()
    private readonly perfDiagnosticsService?: PerfDiagnosticsService,
  ) {
    const connectionString = process.env.POSTGRESQL_CONNECTION_URI;
    if (!connectionString) {
      throw new Error("Missing POSTGRESQL_CONNECTION_URI");
    }

    this.pool = new Pool({ connectionString, max: 20 });
    this.nativeDatabase = createApiDatabase({
      pool: this.pool,
      middleware: [this.createQueryDiagnosticsMiddleware()],
    });
    const database = createApiApplicationDatabase(this.nativeDatabase);
    this.orm = database.orm;
    this.raw = database.raw;
    this.transaction = database.transaction;
  }

  async onModuleInit(): Promise<void> {
    await this.pool.query("SELECT 1");
  }

  async onModuleDestroy(): Promise<void> {
    this.closePromise ??= this.nativeDatabase.close();
    await this.closePromise;
  }

  async ping(): Promise<void> {
    await this.pool.query("SELECT 1");
  }

  async query<Row>(plan: any): Promise<Row[]> {
    const rows = await (await this.nativeDatabase.runtime()).query(plan);
    return normalizeApiDatabaseValue(rows) as Row[];
  }

  async execute(plan: any): Promise<number> {
    const result = await (await this.nativeDatabase.runtime()).execute(plan);
    return Number(result.affectedRows);
  }

  private createQueryDiagnosticsMiddleware(): ApiDatabaseMiddleware {
    const logQuery = (plan: unknown, duration: number) => {
      const { query, params } = describePlan(plan);

      if (isDev && duration >= SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn(
          `Slow query (${duration} ms):\n${query}\nparams: ${JSON.stringify(params)}`,
        );
      }

      if (!isDev && env.PERF_DIAGNOSTICS_ENABLED) {
        this.perfDiagnosticsService?.logSpan("prisma.query", duration, {
          query: truncateQuery(query),
          target: "postgresql",
        });
      }
    };

    return {
      name: "lootlog-query-diagnostics",
      familyId: "sql",
      afterQuery: async (plan, result) => {
        logQuery(plan, result.latencyMs);
      },
      afterExecute: async (plan, result) => {
        logQuery(plan, result.latencyMs);
      },
    };
  }
}
