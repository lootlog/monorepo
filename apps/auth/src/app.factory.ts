import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { auth } from "src/auth/better-auth";
import {
  buildBetterAuthRequest,
  sendBetterAuthResponse,
} from "./app.factory.helpers";
import { AppModule } from "./app.module";

export async function createApp(): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      bodyParser: false,
      bufferLogs: true,
    },
  );

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

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
