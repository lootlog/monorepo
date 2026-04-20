import type { Permission } from "@lootlog/types";
import { createMiddleware } from "hono/factory";
import type { AppVariables } from "../lib/hono.types.js";
import { ForbiddenError } from "../lib/errors/http-errors.js";
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
      throw new ForbiddenError("Guild ID is required");
    }

    if (!userId || !discordId) {
      throw new ForbiddenError("Missing authenticated user metadata");
    }

    const resolvedGuildId = await guildPermissions.resolveGuildId(guildId);

    if (!resolvedGuildId) {
      throw new ForbiddenError();
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
      throw new ForbiddenError();
    }

    c.set("guildId", resolvedGuildId);
    await next();
  });
