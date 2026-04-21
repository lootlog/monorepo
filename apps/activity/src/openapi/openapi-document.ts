import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  DocumentBuilder,
  SwaggerModule,
  type OpenAPIObject,
} from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { sanitizeOpenApiDocument } from "@lootlog/nest-shared/openapi";
import { swaggerConfig } from "src/config/swagger.config";

type OpenApiParameter = {
  in?: string;
  name?: string;
  required?: boolean;
};

type OpenApiOperation = {
  parameters?: OpenApiParameter[];
};

const normalizeActivityQueryParameters = (document: OpenAPIObject) => {
  const pathKeys = [
    "/guilds/{guildId}/activity-logs",
    "/guilds/{guildId}/users/{userId}/activity-logs",
  ] as const;

  for (const pathKey of pathKeys) {
    const operation = document.paths?.[pathKey]?.get as OpenApiOperation;

    if (!operation?.parameters) {
      continue;
    }

    operation.parameters = operation.parameters.filter(
      (parameter) =>
        !(
          parameter.in === "query" &&
          (parameter.name === "guildId" || parameter.name === "userId")
        ),
    );

    for (const parameter of operation.parameters) {
      if (
        parameter.in === "query" &&
        (parameter.name === "type" || parameter.name === "source")
      ) {
        parameter.required = false;
      }
    }
  }

  return document;
};

export function createOpenApiDocument(app: NestFastifyApplication) {
  const config = new DocumentBuilder()
    .setTitle(swaggerConfig.title)
    .setDescription(swaggerConfig.description)
    .setVersion(swaggerConfig.version)
    .addBearerAuth()
    .build();

  return normalizeActivityQueryParameters(
    sanitizeOpenApiDocument(
      cleanupOpenApiDoc(
        SwaggerModule.createDocument(app, config, {
          operationIdFactory: (controllerKey, methodKey) =>
            `${controllerKey}_${methodKey}`,
        }),
        { version: "3.0" },
      ),
    ),
  );
}

export function setupOpenApi(
  app: NestFastifyApplication,
  document: ReturnType<typeof createOpenApiDocument>,
) {
  SwaggerModule.setup(swaggerConfig.path, app, document);
}
