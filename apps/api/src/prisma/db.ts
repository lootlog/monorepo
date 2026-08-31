import postgres from "@prisma/orm-postgres/runtime";
import { Pool } from "pg";
import type { Contract } from "./contract.js";
import contractJson from "./runtime-contract.js";

export const postgresPool = new Pool({
  connectionString: process.env.POSTGRESQL_CONNECTION_URI,
  max: 20,
});

export const db = postgres<Contract>({
  contractJson,
  pg: postgresPool,
});
