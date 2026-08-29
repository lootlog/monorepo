import { createNestFastifyApp } from "@lootlog/nest-shared/app";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.js";

export function createApp(): Promise<NestFastifyApplication> {
  return createNestFastifyApp(AppModule);
}
