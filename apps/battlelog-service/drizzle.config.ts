import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.POSTGRESQL_CONNECTION_URI;
if (!databaseUrl) {
  throw new Error("POSTGRESQL_CONNECTION_URI is required");
}

export default defineConfig({
  schema: "./src/shared/modules/drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
});
