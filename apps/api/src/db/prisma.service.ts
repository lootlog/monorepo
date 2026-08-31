import {
  Injectable,
  Logger,
  Optional,
  type OnModuleDestroy,
} from "@nestjs/common";
import {
  db,
  postgresPool,
  setDatabaseQueryObserver,
  type DatabaseQueryEvent,
} from "#src/prisma/db";
import { PerfDiagnosticsService } from "#src/shared/diagnostics/perf-diagnostics.service";
import type { Contract } from "../prisma/contract.js";

type PrismaModelName =
  keyof Contract["domain"]["namespaces"]["public"]["models"];
type PrismaModels = {
  readonly [Model in PrismaModelName]: any;
};
type PrismaDatabase = Omit<typeof db, "orm" | "transaction"> & {
  readonly orm: { readonly public: PrismaModels };
  transaction<Result>(
    operation: (transaction: any) => PromiseLike<Result>,
  ): Promise<Result>;
};

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  // Prisma RC currently loses relation metadata on namespaced collections.
  // Remove this type-only adapter when the runtime package fixes that declaration.
  readonly db = db as PrismaDatabase;

  constructor(
    @Optional()
    private readonly perfDiagnosticsService?: PerfDiagnosticsService,
  ) {
    setDatabaseQueryObserver((event) => this.logQuery(event));
  }

  async onModuleDestroy(): Promise<void> {
    setDatabaseQueryObserver(undefined);
    await this.db.close();
    await postgresPool.end();
  }

  private logQuery({ durationMs, query }: DatabaseQueryEvent): void {
    const isDevelopment =
      process.env.ENV === "local" || process.env.ENV === "dev";

    if (isDevelopment && durationMs >= 100) {
      this.logger.warn(
        `Slow query (${Math.round(durationMs)} ms): ${this.truncate(query)}`,
      );
    }

    if (!isDevelopment) {
      this.perfDiagnosticsService?.logSpan("prisma.query", durationMs, {
        query: this.truncate(query),
      });
    }
  }

  private truncate(query: string): string {
    const normalized = query.replace(/\s+/g, " ").trim();
    return normalized.length <= 2000
      ? normalized
      : `${normalized.slice(0, 2000)}...`;
  }
}
