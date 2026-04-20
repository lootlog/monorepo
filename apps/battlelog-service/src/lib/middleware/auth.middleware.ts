import { createMiddleware } from "hono/factory";
import type { AppVariables } from "../hono.types.js";

export const userMetadataFromHeaders = createMiddleware<{
  Variables: AppVariables;
}>(async (c, next) => {
  c.set("userId", c.req.raw.headers.get("X-Auth-User-Id"));
  c.set("discordId", c.req.raw.headers.get("X-Auth-Discord-Id"));

  await next();
});

export const requireAuth = createMiddleware<{
  Variables: AppVariables;
}>(async (c, next) => {
  if (!c.var.userId || !c.var.discordId) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  await next();
});
