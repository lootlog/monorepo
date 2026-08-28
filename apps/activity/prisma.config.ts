import "dotenv/config";
import { defineConfig as definePostgresConfig } from "@prisma/orm-postgres/config";
import { definePrismaConfig } from "prisma/config";

export default definePrismaConfig({
  orm: definePostgresConfig({
    contract: "prisma/contract.prisma",
    output: "src/shared/db/generated",
    db: {
      connection: process.env["POSTGRESQL_CONNECTION_URI"],
    },
  }),
});
