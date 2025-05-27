import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import { ServiceConfig } from 'src/config/service.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService>(ConfigService);
  const { port } = configService.get<ServiceConfig>(ConfigKey.SERVICE);
  await app.listen(port);
}
bootstrap();
