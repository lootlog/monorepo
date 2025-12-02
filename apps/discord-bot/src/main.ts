import 'dotenv/config';
import { initObservability } from '@lootlog/instrumentation';

initObservability({
  serviceName: process.env.SERVICE_NAME || 'discord-bot',
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  otlpHeaders: process.env.OTEL_EXPORTER_OTLP_HEADERS,
  serviceEnvironment: process.env.ENV,
  serviceNamespace: process.env.SERVICE_NAMESPACE,
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from './config/config-key.enum';
import { ServiceConfig } from 'src/config/service.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService>(ConfigService);
  const { port } = configService.get<ServiceConfig>(ConfigKey.SERVICE);

  await app.startAllMicroservices();
  await app.listen(port);
}

bootstrap();
