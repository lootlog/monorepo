import type { JsonValue as DatabaseJsonValue } from "@prisma/orm-postgres/target/codec-types";
import type { db } from "../prisma/db.js";

export type JsonValue = DatabaseJsonValue;
export type JsonObject = Record<string, JsonValue | undefined>;
export type InputJsonValue = JsonValue;
export type InputJsonObject = JsonObject;

type Database = typeof db;

export type DatabaseTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];
