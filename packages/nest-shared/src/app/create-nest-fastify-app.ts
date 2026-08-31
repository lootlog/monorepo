import { type NestApplicationOptions, type Type } from "@nestjs/common";
import { type AbstractHttpAdapter, NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";

export async function createNestFastifyApp(
  rootModule: Type<unknown>,
  options: NestApplicationOptions = {},
): Promise<NestFastifyApplication> {
  // pnpm injects this workspace package for consumers with different optional
  // Nest peer sets. The adapter remains runtime-compatible, but its protected
  // base member is nominally tied to a different @nestjs/core peer instance.
  const adapter = new FastifyAdapter() as unknown as AbstractHttpAdapter;
  const app = await NestFactory.create<NestFastifyApplication>(
    rootModule,
    adapter,
    {
      bufferLogs: true,
      ...options,
    },
  );

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  return app;
}
