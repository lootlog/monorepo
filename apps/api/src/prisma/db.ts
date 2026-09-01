import { performance } from "node:perf_hooks";
import postgres from "@prisma/orm-postgres/runtime";
import type { SqlExecutionPlan } from "@prisma/orm-family-sql/relational-core";
import type { SqlMiddleware } from "@prisma/orm-family-sql/runtime";
import { Pool, types } from "pg";
import type { Contract } from "./contract.js";
import contractJson, {
  runtimeNativeEnumArrayTypeNames,
} from "./runtime-contract.js";

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

let configureNativeEnumArraysPromise: Promise<void> | undefined;

export function configureNativeEnumArrays(): Promise<void> {
  configureNativeEnumArraysPromise ??= postgresPool
    .query<{ oid: number }>(
      `SELECT array_type.oid::int
       FROM pg_type AS element_type
       JOIN pg_type AS array_type ON array_type.typelem = element_type.oid
       WHERE element_type.typname = ANY($1::text[])`,
      [runtimeNativeEnumArrayTypeNames],
    )
    .then(({ rows }) => {
      for (const { oid } of rows) {
        types.setTypeParser(oid, (value) =>
          types.arrayParser.create(value, (element) => element).parse(),
        );
      }
    })
    .catch((error: unknown) => {
      configureNativeEnumArraysPromise = undefined;
      throw error;
    });

  return configureNativeEnumArraysPromise;
}

export const db = postgres<Contract>({
  contractJson,
  middleware: [databaseQueryDiagnostics],
  pg: postgresPool,
});
