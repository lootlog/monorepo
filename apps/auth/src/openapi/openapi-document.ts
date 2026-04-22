import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { sanitizeOpenApiDocument } from "@lootlog/nest-shared/openapi";

export function createOpenApiDocument(app: NestFastifyApplication) {
  const config = new DocumentBuilder()
    .setTitle("Auth API")
    .setDescription("Authentication and identity service documentation")
    .setVersion("1.0")
    .build();

  return sanitizeOpenApiDocument(
    SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey, methodKey) =>
        `${controllerKey}_${methodKey}`,
    }),
  );
}
