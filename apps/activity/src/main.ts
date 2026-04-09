import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ConfigService } from "@nestjs/config";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";

import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { ServiceConfig } from "src/config/service.config";
import { ConfigKey } from "src/config/config-key.enum";
import { SwaggerConfig } from "src/config/swagger.config";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const configService = app.get<ConfigService>(ConfigService);

  const { port } = configService.get<ServiceConfig>(ConfigKey.SERVICE, {
    infer: true,
  });
  const { path, title, description, version } =
    configService.get<SwaggerConfig>(ConfigKey.SWAGGER, { infer: true });

  const swaggerDocument = new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(version)
    .addBearerAuth()
    .build();

  const document = cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, swaggerDocument),
  );
  SwaggerModule.setup(path, app, document);

  await app.startAllMicroservices();
  await app.listen(port, "0.0.0.0");
}

bootstrap();
