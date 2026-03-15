import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { ConfigKey } from "./config/config-key.enum";
import { ServiceConfig } from "src/config/service.config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const configService = app.get<ConfigService>(ConfigService);
  const { port } = configService.get<ServiceConfig>(ConfigKey.SERVICE);

  await app.startAllMicroservices();
  await app.listen(port);
}

bootstrap();
