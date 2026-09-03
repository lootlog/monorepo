import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/shared/modules/drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.POSTGRESQL_CONNECTION_URI ?? "" },
});
