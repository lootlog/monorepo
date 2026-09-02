import { NestFactory } from "@nestjs/core";
import type { INestApplicationContext } from "@nestjs/common";
import type { AbstractHttpAdapter } from "@nestjs/core/adapters/http-adapter";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { APPLICATION_NEST_LOGGER } from "#src/shared/logging/logger-token";
import { AppModule } from "./app.module.js";

export async function createApp(): Promise<INestApplicationContext> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(APPLICATION_NEST_LOGGER));
  return app;
}

export async function createOpenApiApp(): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter() as unknown as AbstractHttpAdapter;
  return NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    logger: false,
  });
}
