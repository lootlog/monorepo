import { createNestFastifyApp } from "@lootlog/nest-shared/app";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { auth } from "#src/auth/better-auth";
import {
  buildBetterAuthRequest,
  sendBetterAuthResponse,
} from "./app.factory.helpers.js";
import { AppModule } from "./app.module.js";

export async function createApp(): Promise<NestFastifyApplication> {
  const app = await createNestFastifyApp(AppModule, { bodyParser: false });

  app.enableShutdownHooks();

  const fastify = app.getHttpAdapter().getInstance();

  for (const routePath of ["/idp", "/idp/*"]) {
    fastify.all(routePath, async (request, reply) => {
      const authRequest = await buildBetterAuthRequest(request);
      const authResponse = await auth.handler(authRequest);

      return sendBetterAuthResponse(reply, authResponse);
    });
  }

  return app;
}
