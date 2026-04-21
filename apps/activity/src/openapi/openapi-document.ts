import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { sanitizeOpenApiDocument } from "@lootlog/nest-shared/openapi";
import { swaggerConfig } from "src/config/swagger.config";

export function createOpenApiDocument(app: NestFastifyApplication) {
  const config = new DocumentBuilder()
    .setTitle(swaggerConfig.title)
    .setDescription(swaggerConfig.description)
    .setVersion(swaggerConfig.version)
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
  SwaggerModule.setup(swaggerConfig.path, app, document);
}
