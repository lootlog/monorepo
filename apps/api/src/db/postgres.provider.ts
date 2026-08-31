import type { Provider } from "@nestjs/common";
import { postgresPool } from "#src/prisma/db";

export const POSTGRES_POOL = Symbol("POSTGRES_POOL");

export const postgresPoolProvider = {
  provide: POSTGRES_POOL,
  useValue: postgresPool,
} satisfies Provider;
