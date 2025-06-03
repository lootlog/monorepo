import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { APP_CONFIG } from "./config/app.config.js";
import { players } from "./players/players.controller.js";
import { logger } from "hono/logger";
import { userMetadataFromHeaders } from "@lootlog/api-helpers";
import { setupAMQP } from "./lib/rabbitmq.js";

const app = new Hono<{
  Variables: {
    userId: string | null;
    discordId: string | null;
  };
}>();

await setupAMQP();

app.use("*", logger());
app.use("*", userMetadataFromHeaders);

app.route("/players", players);

const port = APP_CONFIG.port;

console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
