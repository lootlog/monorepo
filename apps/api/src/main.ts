import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ServiceConfig } from 'src/config/service.config';
import { ValidationPipe } from '@nestjs/common';
import * as winston from 'winston';
import { WinstonTransport as AxiomTransport } from '@axiomhq/winston';
import { RuntimeEnvironment } from 'src/types/common.types';
import {
  NestFastifyApplication,
  FastifyAdapter,
} from '@nestjs/platform-fastify';
import { WinstonModule } from 'nest-winston';

async function bootstrap() {
  const { ENV, HOSTNAME, AXIOM_DATASET, AXIOM_TOKEN } = process.env;

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    // {
    //   logger: WinstonModule.createLogger({
    //     level: 'info',
    //     format: winston.format.json(),
    //     defaultMeta: { service: `${ENV}-${HOSTNAME}` },
    //     transports: [
    //       new AxiomTransport({
    //         dataset: AXIOM_DATASET,
    //         token: AXIOM_TOKEN,
    //       }),
    //     ],
    //   }),
    // },
  );
  const configService = app.get<ConfigService>(ConfigService);

  const { port, env } = configService.get<ServiceConfig>('service', {
    infer: true,
  });
  // app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  if (env === RuntimeEnvironment.LOCAL) {
    app.enableCors();
  }

  app.useGlobalPipes(new ValidationPipe());

  await app.startAllMicroservices();
  await app.listen(port, '0.0.0.0');
}
bootstrap();
