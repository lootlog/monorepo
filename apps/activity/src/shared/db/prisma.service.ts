import {
  createActivityApplicationDatabase,
  normalizeActivityDatabaseValue,
  type ActivityApplicationDatabase,
} from "./application-client";
import {
  createActivityDatabase,
  type ActivityDatabaseMiddleware,
} from "./database";
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { Pool } from "pg";

const SLOW_QUERY_THRESHOLD_MS = 100;

function describePlan(plan: unknown): string {
  if (!plan || typeof plan !== "object") return "unknown";
  const query = (plan as { sql?: unknown }).sql;
  return typeof query === "string" ? query : "unknown";
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly orm: ActivityApplicationDatabase["orm"];
  readonly raw: ActivityApplicationDatabase["raw"];
  readonly transaction: ActivityApplicationDatabase["transaction"];

  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;
  private readonly nativeDatabase: ReturnType<typeof createActivityDatabase>;
  private closePromise?: Promise<void>;

  constructor() {
    const connectionString = process.env.POSTGRESQL_CONNECTION_URI;
    if (!connectionString) {
      throw new Error("Missing POSTGRESQL_CONNECTION_URI");
    }

    this.pool = new Pool({ connectionString });
    this.nativeDatabase = createActivityDatabase({
      pool: this.pool,
      middleware: [this.createDiagnosticsMiddleware()],
    });
    const database = createActivityApplicationDatabase(this.nativeDatabase);
    this.orm = database.orm;
    this.raw = database.raw;
    this.transaction = database.transaction;
  }

  async onModuleInit(): Promise<void> {
    await this.ping();
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
    return normalizeActivityDatabaseValue(rows) as Row[];
  }

  private createDiagnosticsMiddleware(): ActivityDatabaseMiddleware {
    const logQuery = (plan: unknown, duration: number) => {
      const query = describePlan(plan);
      if (duration >= SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn(`Slow query (${duration} ms):\n${query}`);
      } else {
        this.logger.debug(`Query (${duration} ms)`);
      }
    };

    return {
      name: "activity-query-diagnostics",
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
