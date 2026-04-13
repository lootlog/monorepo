import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { env } from "src/config/env";
import * as yaml from "js-yaml";
import { writeFileSync } from "node:fs";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { RuntimeEnvironment } from "@lootlog/types";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle("Lootlog API")
    .setDescription("The Lootlog API documentation")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = cleanupOpenApiDoc(
    SwaggerModule.createDocument(app, config, {
      operationIdFactory: (controllerKey, methodKey) =>
        `${controllerKey}_${methodKey}`,
    }),
    { version: "3.0" },
  );
  SwaggerModule.setup("api/docs", app, document);

  if (env.ENV === RuntimeEnvironment.LOCAL) {
    // Export OpenAPI document as YAML
    const yamlDocument = yaml.dump(document);
    writeFileSync("openapi.yaml", yamlDocument, "utf8");
  }

  await app.startAllMicroservices();
  await app.listen(env.PORT, "0.0.0.0");
}
bootstrap();
