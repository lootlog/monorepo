import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { db } from "#src/prisma/db";
import type { Contract } from "./prisma/contract.js";

type PrismaModelName =
  keyof Contract["domain"]["namespaces"]["public"]["models"];
type PrismaModels = {
  readonly [Model in PrismaModelName]: any;
};
type PrismaDatabase = Omit<typeof db, "orm" | "transaction"> & {
  readonly orm: { readonly public: PrismaModels };
  transaction<Result>(
    operation: (transaction: any) => PromiseLike<Result>,
  ): Promise<Result>;
};

@Injectable()
export class PrismaService implements OnModuleDestroy {
  // The current namespaced collection declaration drops relation metadata.
  // Keep the workaround at this boundary until the runtime package fixes it.
  readonly db = db as PrismaDatabase;

  async onModuleDestroy(): Promise<void> {
    await this.db.close();
  }
}
