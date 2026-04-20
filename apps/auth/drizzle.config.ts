import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const ssl = process.env.POSTGRESQL_SSL_CA
  ? { ca: process.env.POSTGRESQL_SSL_CA }
  : undefined;

export default defineConfig({
  schema: "./src/database/drizzle.schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.POSTGRESQL_HOST ?? "localhost",
    port: Number(process.env.POSTGRESQL_PORT ?? 5432),
    user: process.env.POSTGRESQL_USER ?? "",
    password: process.env.POSTGRESQL_PASSWORD ?? "",
    database: process.env.POSTGRESQL_DATABASE ?? "",
    ssl,
  },
});
