import { performance } from "node:perf_hooks";
import postgres from "@prisma/orm-postgres/runtime";
import type { SqlExecutionPlan } from "@prisma/orm-family-sql/relational-core";
import type { SqlMiddleware } from "@prisma/orm-family-sql/runtime";
import { Pool } from "pg";
import type { Contract } from "./contract.js";
import contractJson from "./runtime-contract.js";

export type DatabaseQueryEvent = {
  durationMs: number;
  query: string;
};

let queryObserver: ((event: DatabaseQueryEvent) => void) | undefined;
const queryStartedAt = new WeakMap<SqlExecutionPlan, number>();

export function setDatabaseQueryObserver(
  observer: ((event: DatabaseQueryEvent) => void) | undefined,
): void {
  queryObserver = observer;
}

function startQuery(plan: SqlExecutionPlan): void {
  queryStartedAt.set(plan, performance.now());
}

function finishQuery(plan: SqlExecutionPlan): void {
  const startedAt = queryStartedAt.get(plan);
  queryStartedAt.delete(plan);
  if (startedAt === undefined) return;

  queryObserver?.({
    durationMs: performance.now() - startedAt,
    query: plan.sql,
  });
}

export const databaseQueryDiagnostics = {
  name: "query-diagnostics",
  beforeQuery: startQuery,
  afterQuery: (plan) => {
    finishQuery(plan);
    return Promise.resolve();
  },
  beforeExecute: startQuery,
  afterExecute: (plan) => {
    finishQuery(plan);
    return Promise.resolve();
  },
} satisfies SqlMiddleware;

export const postgresPool = new Pool({
  connectionString: process.env.POSTGRESQL_CONNECTION_URI,
  max: 20,
});

export const db = postgres<Contract>({
  contractJson,
  middleware: [databaseQueryDiagnostics],
  pg: postgresPool,
});
