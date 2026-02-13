import { defineConfig } from "prisma/config";
import "dotenv/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url:
      process.env.NOTIFICATIONS_POSTGRESQL_CONNECTION_URI ??
      process.env.POSTGRESQL_CONNECTION_URI ??
      "postgresql://placeholder:placeholder@localhost:5436/placeholder",
  },
});
