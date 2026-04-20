import { toNodeHandler } from "better-auth/node";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { WINSTON_MODULE_NEST_PROVIDER } from "nest-winston";
import { auth } from "src/auth/better-auth";
import { AppModule } from "./app.module";
import { env } from "src/config/env";

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      bodyParser: false,
      bufferLogs: true,
    },
  );

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const authHandler = toNodeHandler(auth);
  const fastify = app.getHttpAdapter().getInstance();

  for (const routePath of ["/idp", "/idp/*"]) {
    fastify.all(routePath, async (request, reply) => {
      reply.hijack();
      await authHandler(request.raw, reply.raw);
    });
  }

  await app.listen(env.PORT, "0.0.0.0");
}

bootstrap();
