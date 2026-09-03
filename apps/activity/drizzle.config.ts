import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/database/schema.ts",
  out: "./drizzle/migrations",
  dbCredentials: {
    url:
      process.env.POSTGRESQL_CONNECTION_URI ??
      "postgresql://localhost/activity",
  },
});
