import type { FastifyReply, FastifyRequest } from "fastify";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { sanitizeOpenApiDocument } from "@lootlog/nest-shared/openapi";

export function createOpenApiDocument(app: NestFastifyApplication) {
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Search API")
    .setDescription("Meilisearch-powered search microservice")
    .setVersion("1.0")
    .build();

  return sanitizeOpenApiDocument(
    cleanupOpenApiDoc(
      SwaggerModule.createDocument(app, swaggerConfig, {
        operationIdFactory: (controllerKey, methodKey) =>
          `${controllerKey}_${methodKey}`,
      }),
      { version: "3.0" },
    ),
  );
}

export function setupOpenApi(
  app: NestFastifyApplication,
  document: ReturnType<typeof createOpenApiDocument>,
) {
  const fastifyInstance = app.getHttpAdapter().getInstance();

  fastifyInstance.get(
    "/doc",
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send(document);
    },
  );

  SwaggerModule.setup("docs", app, document);
}
