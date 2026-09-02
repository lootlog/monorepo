import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.POSTGRESQL_CONNECTION_URI;

if (!databaseUrl) {
  throw new Error("POSTGRESQL_CONNECTION_URI is required by Drizzle Kit");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/database/drizzle/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
