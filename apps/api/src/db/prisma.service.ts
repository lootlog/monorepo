import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
      errorFormat: 'colorless',
    });
  }
  async onModuleInit() {
    await this.$connect();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // this.$on('query', (event: Prisma.QueryEvent) => {
    //   // console.log('xd', event);
    //   console.log('Duration: ' + event.duration + 'ms');
    // });
  }
}
