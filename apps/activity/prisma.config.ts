import { defineConfig as definePostgresConfig } from "@prisma/orm-postgres/config";
import "dotenv/config";
import { definePrismaConfig } from "prisma/config";

export default definePrismaConfig({
  orm: definePostgresConfig({
    contract: "src/prisma/contract.prisma",
    db: {
      connection: process.env.POSTGRESQL_CONNECTION_URI,
    },
  }),
});
