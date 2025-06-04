import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { APP_CONFIG } from "./config/app.config.js";
import { players } from "./players/players.controller.js";
import { logger } from "hono/logger";
import { userMetadataFromHeaders } from "@lootlog/api-helpers";
import { setupAMQP } from "./lib/rabbitmq.js";
import { setupPlayersHandlers } from "./players/players.handlers.js";
import { npcs } from "./npcs/npcs.controller.js";
import { setupNpcsHandlers } from "./npcs/npcs.handlers.js";

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
await setupPlayersHandlers();

app.route("/npcs", npcs);
await setupNpcsHandlers();

const port = APP_CONFIG.port;

console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
