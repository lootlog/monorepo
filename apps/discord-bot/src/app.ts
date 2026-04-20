import { httpInstrumentationMiddleware } from "@hono/otel";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { DiscordSyncService } from "./bot/discord-sync.service.js";
import { APP_CONFIG } from "./config/app.config.js";
import { logger } from "./config/winston.config.js";

interface AppDependencies {
  discordSyncService: Pick<
    DiscordSyncService,
    "getGuildChannels" | "refreshGuildChannels" | "getGuildSyncStatus"
  >;
}

export function createApp({ discordSyncService }: AppDependencies) {
  const app = new Hono();

  app.use(
    "*",
    httpInstrumentationMiddleware({
      serviceName: APP_CONFIG.serviceName,
      serviceVersion: "1.0.0",
    }),
  );
  app.use("*", async (context, next) => {
    const requestStartedAt = Date.now();

    await next();

    logger.info(
      `${context.req.method} ${context.req.path} ${context.res.status} ${Date.now() - requestStartedAt}ms`,
    );
  });

  app.onError((error, context) => {
    logger.error("discord-bot request failed", {
      method: context.req.method,
      path: context.req.path,
      error: error instanceof Error ? error.message : String(error),
    });

    if (error instanceof HTTPException) {
      return error.getResponse();
    }

    return context.json({ message: "Internal Server Error" }, 500);
  });

  app.get("/healthz", (context) => {
    return context.text("OK");
  });

  const internalGuildRoutes = new Hono()
    .get("/:guildId/channels", async (context) => {
      const guildId = context.req.param("guildId");

      return context.json(await discordSyncService.getGuildChannels(guildId));
    })
    .post("/:guildId/channels/refresh", async (context) => {
      const guildId = context.req.param("guildId");

      return context.json(
        await discordSyncService.refreshGuildChannels(guildId),
      );
    })
    .get("/:guildId/sync-status", async (context) => {
      const guildId = context.req.param("guildId");

      return context.json(await discordSyncService.getGuildSyncStatus(guildId));
    });

  app.route("/internal/guilds", internalGuildRoutes);

  return app;
}
