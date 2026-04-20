import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { sanitizeOpenApiDocument } from "@lootlog/nest-shared/openapi";
import { AppModule } from "./app.module";
import { env } from "src/config/env";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Search API")
    .setDescription("Meilisearch-powered search microservice")
    .setVersion("1.0")
    .build();

  const document = sanitizeOpenApiDocument(
    cleanupOpenApiDoc(
      SwaggerModule.createDocument(app, swaggerConfig, {
        operationIdFactory: (controllerKey, methodKey) =>
          `${controllerKey}_${methodKey}`,
      }),
      { version: "3.0" },
    ),
  );

  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.get(
    "/doc",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send(document);
    },
  );

  SwaggerModule.setup("docs", app, document);

  await app.startAllMicroservices();
  await app.listen(env.PORT, "0.0.0.0");
}

void bootstrap();
