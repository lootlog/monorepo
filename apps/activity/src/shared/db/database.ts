import "temporal-polyfill/full/global";
import postgres from "@prisma/orm-postgres/runtime";
import type { Pool } from "pg";
import type { Contract } from "./generated/contract.js";
import contractJson from "./generated/contract.json";

type RuntimeOptions = Parameters<typeof postgres<Contract>>[0];

export type ActivityDatabaseMiddleware = NonNullable<
  RuntimeOptions["middleware"]
>[number];

export type CreateActivityDatabaseOptions = {
  pool: Pool;
  middleware?: readonly ActivityDatabaseMiddleware[];
};

export function createActivityDatabase(options: CreateActivityDatabaseOptions) {
  return postgres<Contract>({
    contractJson,
    pg: options.pool,
    middleware: options.middleware,
  });
}

export type ActivityDatabase = ReturnType<typeof createActivityDatabase>;
export type ActivityDatabaseTransaction = Parameters<
  Parameters<ActivityDatabase["transaction"]>[0]
>[0];

export type {
  Contract as ActivityDatabaseContract,
  FieldInputTypes as ActivityDatabaseInputTypes,
  FieldOutputTypes as ActivityDatabaseOutputTypes,
} from "./generated/contract.js";
