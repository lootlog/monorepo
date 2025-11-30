import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from 'prisma/generated/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);
  private readonly SLOW_QUERY_THRESHOLD_MS = 100;

  constructor() {
    const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

    super({
      adapter: pool,
    });

    this.$on('query', (event: Prisma.QueryEvent) => {
      const { duration, query, params, target } = event;

      if (duration >= this.SLOW_QUERY_THRESHOLD_MS) {
        this.logger.warn(
          `Slow query (${duration} ms) [${target}]:
          ${query}
          params: ${params}`,
        );
      } else {
        this.logger.debug(`Query (${duration} ms) [${target}]`);
      }
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
