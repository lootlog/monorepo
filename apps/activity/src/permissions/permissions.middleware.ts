import type { Permission } from "@lootlog/types";
import { createMiddleware } from "hono/factory";
import type { AppVariables } from "../lib/hono.types.js";
import type { GuildPermissions } from "./guild-permissions.js";

export const requireGuildPermission = (
  guildPermissions: GuildPermissions,
  requiredPermissions: Permission[],
) =>
  createMiddleware<{
    Variables: AppVariables;
  }>(async (c, next) => {
    const { userId, discordId } = c.var;
    const guildId = c.req.param("guildId");

    if (!guildId) {
      return c.json({ message: "Guild ID is required" }, 403);
    }

    if (!userId || !discordId) {
      return c.json({ message: "Missing authenticated user metadata" }, 403);
    }

    const resolvedGuildId = await guildPermissions.resolveGuildId(guildId);

    if (!resolvedGuildId) {
      return c.json({ message: "Insufficient permissions" }, 403);
    }

    const userPermissions = await guildPermissions.getUserGuildPermissions(
      discordId,
      userId,
      resolvedGuildId,
    );

    const hasPermission = requiredPermissions.some((requiredPermission) =>
      userPermissions.includes(requiredPermission),
    );

    if (!hasPermission) {
      return c.json({ message: "Insufficient permissions" }, 403);
    }

    c.set("guildId", resolvedGuildId);
    await next();
  });
