import { initHonoObservability } from "@lootlog/instrumentation";
import "dotenv/config";

initHonoObservability({
  serviceName: process.env.SERVICE_NAME || "search",
  otlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  otlpHeaders: process.env.OTEL_EXPORTER_OTLP_HEADERS,
  serviceEnvironment: process.env.ENV,
  serviceNamespace: process.env.SERVICE_NAMESPACE,
  traceSampleRate: 0.1,
  forceEnable: false,
  enableDebugLogging: false,
});

import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { httpInstrumentationMiddleware } from "@hono/otel";
import { APP_CONFIG } from "./config/app.config.js";
import { players } from "./players/players.controller.js";
import { logger as winstonLogger } from "./config/winston.config.js";
import { userMetadataFromHeaders } from "@lootlog/api-helpers";
import { setupAMQP } from "./lib/rabbitmq.js";
import { setupPlayersHandlers } from "./players/players.handlers.js";
import { npcs } from "./npcs/npcs.controller.js";
import { setupNpcsHandlers } from "./npcs/npcs.handlers.js";
import { items } from "./items/items.controller.js";
import { setupItemsHandlers } from "./items/items.handlers.js";
import { all } from "./all/all.controller.js";

const app = new OpenAPIHono<{
  Variables: {
    userId: string | null;
    discordId: string | null;
  };
}>();

await setupAMQP();

app.use(
  "*",
  httpInstrumentationMiddleware({
    serviceName: process.env.SERVICE_NAME || "search",
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
app.use("*", userMetadataFromHeaders);

app.get("/healthz", (c) => {
  return c.text("Healthy");
});

app.route("/players", players);
await setupPlayersHandlers();

app.route("/npcs", npcs);
await setupNpcsHandlers();

app.route("/items", items);
await setupItemsHandlers();

app.route("/all", all);

app.doc("/doc", {
  openapi: "3.1.0",
  info: {
    title: "Search API",
    version: "1.0.0",
    description: "Meilisearch-powered search microservice",
  },
});

app.get("/docs", swaggerUI({ url: "/doc" }));

const port = APP_CONFIG.port;

winstonLogger.info(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
