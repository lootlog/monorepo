import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import type { ServiceConfig } from "src/config/service.config";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const configService = app.get<ConfigService>(ConfigService);

  const { port } = configService.get<ServiceConfig>("service", {
    infer: true,
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle("Lootlog API")
    .setDescription("The Lootlog API documentation")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
  SwaggerModule.setup("api/docs", app, document);

  await app.startAllMicroservices();
  await app.listen(port, "0.0.0.0");
}
bootstrap();
