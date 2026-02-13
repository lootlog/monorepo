import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import { ConfigKey } from "src/config/config-key.enum";
import type { ServiceConfig } from "src/config/service.config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get<ConfigService>(ConfigService);
  const serviceConfig = configService.get<ServiceConfig>(ConfigKey.SERVICE);

  if (!serviceConfig) {
    throw new Error("Missing service configuration");
  }

  const { port } = serviceConfig;

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.listen(port);
}

bootstrap();
