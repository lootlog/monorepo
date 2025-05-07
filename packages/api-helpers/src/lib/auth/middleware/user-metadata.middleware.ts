import { createMiddleware } from "hono/factory";

export const userMetadataFromHeaders = createMiddleware(async (c, next) => {
  c.set("userId", c.req.raw.headers.get("X-Auth-User-Id"));
  c.set("discordId", c.req.raw.headers.get("X-Auth-Discord-Id"));

  await next();
});
