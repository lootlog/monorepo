import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../../../generated/client';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly winstonLogger: Logger,
  ) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
      errorFormat: 'colorless',
    });
  }

  async onModuleInit() {
    await this.$connect();

    this.$on('query' as never, (e: any) => {
      // this.logger.debug(`Query: ${e.query}`);
      // this.logger.debug(`Params: ${e.params}`);
      // this.logger.debug(`Duration: ${e.duration}ms`);
    });

    this.$on('info' as never, (e: any) => {
      this.winstonLogger.log('info', e.message);
    });

    this.$on('warn' as never, (e: any) => {
      this.winstonLogger.log('warn', e.message);
    });

    this.$on('error' as never, (e: any) => {
      this.winstonLogger.log('error', e.message);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
