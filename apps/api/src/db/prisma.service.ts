import { Inject, Injectable } from "@nestjs/common";
import {
  POSTGRES_POOL,
  PRISMA_DB,
  type PrismaDb,
} from "#src/db/prisma.provider";
import type { Pool } from "pg";

@Injectable()
export class PrismaService {
  constructor(
    @Inject(PRISMA_DB) private readonly client: PrismaDb,
    @Inject(POSTGRES_POOL) private readonly postgres: Pool,
  ) {}

  get orm(): any {
    return this.client.orm;
  }

  get raw(): PrismaDb["raw"] {
    return this.client.raw;
  }

  transaction<T>(operation: (transaction: any) => Promise<T>): Promise<T> {
    return this.client.transaction(operation);
  }

  runtime(): ReturnType<PrismaDb["runtime"]> {
    return this.client.runtime();
  }

  async sql<Result>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<Result> {
    let statement = strings[0] ?? "";
    for (let index = 0; index < values.length; index += 1) {
      statement += `$${index + 1}${strings[index + 1] ?? ""}`;
    }

    const result = await this.postgres.query(statement, values);
    return result.rows as Result;
  }

  async query<Result>(
    statement: string,
    ...values: unknown[]
  ): Promise<Result> {
    const result = await this.postgres.query(statement, values);
    return result.rows as Result;
  }
}
