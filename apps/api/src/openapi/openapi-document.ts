import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { sanitizeOpenApiDocument } from "@lootlog/nest-shared/openapi";

export function createOpenApiDocument(app: NestFastifyApplication) {
  const config = new DocumentBuilder()
    .setTitle("Lootlog API")
    .setDescription("The Lootlog API documentation")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  return sanitizeOpenApiDocument(
    cleanupOpenApiDoc(
      SwaggerModule.createDocument(app, config, {
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
  SwaggerModule.setup("api/docs", app, document);
}
