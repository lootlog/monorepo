import { type NestApplicationOptions, type Type } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";

export async function createNestFastifyApp(
  rootModule: Type<unknown>,
  options: NestApplicationOptions = {},
): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    rootModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
      ...options,
    },
  );

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  return app;
}
