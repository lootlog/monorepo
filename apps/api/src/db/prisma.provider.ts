import {
  Injectable,
  type OnModuleDestroy,
  type Provider,
} from "@nestjs/common";
import { db, postgresPool } from "#src/prisma/db";

export const PRISMA_DB = Symbol("PRISMA_DB");
export const POSTGRES_POOL = Symbol("POSTGRES_POOL");

export type PrismaDb = typeof db;

export const prismaProvider = {
  provide: PRISMA_DB,
  useValue: db,
} satisfies Provider;

export const postgresPoolProvider = {
  provide: POSTGRES_POOL,
  useValue: postgresPool,
} satisfies Provider;

@Injectable()
export class PrismaLifecycle implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await db.close();
  }
}
