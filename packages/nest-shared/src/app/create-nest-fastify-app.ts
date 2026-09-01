import type { NestApplicationOptions, Type } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { AbstractHttpAdapter } from "@nestjs/core/adapters/http-adapter";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";

export async function createNestFastifyApp(
  rootModule: Type<unknown>,
  options: NestApplicationOptions = {},
): Promise<NestFastifyApplication> {
  // Nest's peer-resolved packages can expose nominally distinct adapter types
  // even though the runtime adapter implements the required contract.
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
