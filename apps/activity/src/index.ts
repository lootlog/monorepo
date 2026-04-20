import { serve } from "@hono/node-server";
import {
  closeNodeServer,
  registerGracefulShutdown,
} from "@lootlog/hono-shared";
import {
  initHonoObservability,
  shutdownHonoObservability,
} from "@lootlog/instrumentation";
import { createApp, createAppContext } from "./app.js";
import { APP_CONFIG } from "./config/env.js";
import { logger } from "./config/winston.config.js";

initHonoObservability({
  serviceName: APP_CONFIG.serviceName,
  otlpEndpoint: APP_CONFIG.observability.otlpEndpoint,
  otlpHeaders: APP_CONFIG.observability.otlpHeaders,
  serviceEnvironment: APP_CONFIG.env,
  serviceNamespace: APP_CONFIG.observability.serviceNamespace,
  traceSampleRate: 0.1,
  forceEnable: false,
  enableDebugLogging: false,
});

const appContext = await createAppContext();
const app = createApp(appContext);

logger.info("Activity service is running", {
  url: `http://localhost:${APP_CONFIG.port}`,
});

const server = serve({
  fetch: app.fetch,
  port: APP_CONFIG.port,
});

registerGracefulShutdown({
  logger,
  message: "Shutting down activity service",
  onShutdown: async () => {
    await closeNodeServer(server);
    await appContext.close();
    await shutdownHonoObservability();
  },
});
