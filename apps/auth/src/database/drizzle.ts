import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { env } from "src/config/env";
import { betterAuthSchema } from "./drizzle.schema";

export const drizzlePool = new pg.Pool({
  host: env.POSTGRESQL_HOST,
  port: env.POSTGRESQL_PORT,
  user: env.POSTGRESQL_USER,
  password: env.POSTGRESQL_PASSWORD,
  database: env.POSTGRESQL_DATABASE,
  ssl: env.POSTGRESQL_SSL_CA
    ? {
        ca: env.POSTGRESQL_SSL_CA,
      }
    : undefined,
});

export const db = drizzle({
  client: drizzlePool,
  schema: betterAuthSchema,
});

export { betterAuthSchema };
