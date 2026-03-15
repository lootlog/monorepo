import { initHonoObservability } from "@lootlog/instrumentation";
import "dotenv/config";

initHonoObservability({
  serviceName: process.env.SERVICE_NAME || "auth",
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  otlpHeaders: process.env.OTEL_EXPORTER_OTLP_HEADERS,
  serviceEnvironment: process.env.ENV,
  serviceNamespace: process.env.SERVICE_NAMESPACE,
  traceSampleRate: 0.1,
  forceEnable: false,
  enableDebugLogging: false,
});

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { httpInstrumentationMiddleware } from "@hono/otel";
import { APP_CONFIG } from "./config/app.config.js";
import { auth } from "./lib/auth.js";
import { logger as winstonLogger } from "./config/winston.config.js";
import { healthzController } from "./healthz/healthz.controller.js";
import { sessionMiddleware } from "./lib/middleware/session.middleware.js";
import { authController } from "./auth/auth.controller.js";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

app.use(
  "*",
  httpInstrumentationMiddleware({
    serviceName: process.env.SERVICE_NAME || "auth",
    serviceVersion: "1.0.0",
  }),
);
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  winstonLogger.info(
    `${c.req.method} ${c.req.path} ${c.res.status} ${duration}ms`,
  );
});
app.use("*", sessionMiddleware);

app.route("/healthz", healthzController);

app.route("/auth", authController);

app.on(["POST", "GET"], "/idp/**", (c) => {
  return auth.handler(c.req.raw);
});

const port = APP_CONFIG.port;

winstonLogger.info(`Server is running on ${APP_CONFIG.appUrl}`);

serve({
  fetch: app.fetch,
  port,
});
