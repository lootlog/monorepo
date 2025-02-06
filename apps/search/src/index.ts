import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { APP_CONFIG } from "./config/app.config.js";
import { verifyTokenMiddleware } from "./lib/middleware/bearer-auth.js";
import { players } from "./players/players.controller.js";

const app = new Hono<{
  Variables: {
    userId: string | null;
  };
}>();

app.use("*", cors());
app.use("*", verifyTokenMiddleware);

app.route("/players", players);

const port = APP_CONFIG.port;

console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
