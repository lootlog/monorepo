import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { APP_CONFIG } from "./config/app.config.js";
import { auth } from "./lib/auth.js";
import { logger } from "hono/logger";
import { setupAMQP } from "./lib/rabbitmq.js";
import { healthzController } from "./healthz/healthz.controller.js";
import { sessionMiddleware } from "./lib/middleware/session.middleware.js";
import { authController } from "./auth/auth.controller.js";
import { setupAuthHandlers } from "./auth/auth.handler.js";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

await setupAMQP();

app.use("*", logger());
app.use("*", sessionMiddleware);

app.route("/healthz", healthzController);

app.route("/auth", authController);
await setupAuthHandlers();

app.on(["POST", "GET"], "/idp/**", async (c) => {
  return auth.handler(c.req.raw);
});

const port = APP_CONFIG.port;

console.log(`Server is running on ${APP_CONFIG.appUrl}`);

serve({
  fetch: app.fetch,
  port,
});
