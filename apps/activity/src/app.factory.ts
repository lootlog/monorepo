import { createNestFastifyApp } from "@lootlog/nest-shared/app";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

export function createApp(): Promise<NestFastifyApplication> {
  return createNestFastifyApp(AppModule);
}
