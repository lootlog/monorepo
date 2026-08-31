import type { Provider } from "@nestjs/common";
import { db } from "#src/prisma/db";

export const PRISMA_DB = Symbol("PRISMA_DB");

export type PrismaDb = typeof db;

export const prismaProvider = {
  provide: PRISMA_DB,
  useValue: db,
} satisfies Provider;
