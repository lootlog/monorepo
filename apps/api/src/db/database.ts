import "temporal-polyfill/full/global";
import postgres from "@prisma/orm-postgres/runtime";
import type { Pool } from "pg";
import type { Contract } from "./generated/contract.js";
import contractJson from "./generated/contract.json";

type RuntimeOptions = Parameters<typeof postgres<Contract>>[0];

export type ApiDatabaseMiddleware = NonNullable<
  RuntimeOptions["middleware"]
>[number];

export type CreateApiDatabaseOptions = {
  pool: Pool;
  middleware?: readonly ApiDatabaseMiddleware[];
};

export function createApiDatabase(options: CreateApiDatabaseOptions) {
  return postgres<Contract>({
    contractJson,
    pg: options.pool,
    middleware: options.middleware,
  });
}

export type ApiDatabase = ReturnType<typeof createApiDatabase>;
export type ApiDatabaseTransaction = Parameters<
  Parameters<ApiDatabase["transaction"]>[0]
>[0];

export type {
  Contract as ApiDatabaseContract,
  FieldInputTypes as ApiDatabaseInputTypes,
  FieldOutputTypes as ApiDatabaseOutputTypes,
} from "./generated/contract.js";
