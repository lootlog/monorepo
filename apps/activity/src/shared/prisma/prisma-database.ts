import { PrismaPg } from "@prisma/adapter-pg";
import type { Logger } from "winston";
import { PrismaClient } from "../../generated/prisma/client.js";

export class PrismaDatabase extends PrismaClient {
  constructor(connectionString: string, _logger: Logger) {
    super({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  async connect() {
    await this.$connect();
  }

  async close() {
    await this.$disconnect();
  }

  async ping() {
    await this.$queryRaw`SELECT 1`;
  }
}
