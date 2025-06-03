import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { APP_CONFIG } from "./config/app.config.js";
import { auth } from "./lib/auth.js";
import { logger } from "hono/logger";
import type { JwksKeys } from "@lootlog/api-helpers";
import { validateToken } from "@lootlog/api-helpers";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

app.use("*", logger());

app.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  c.set("user", session.user);
  c.set("session", session.session);

  return next();
});

app.get("/healthz", (c) => {
  return c.text("Healthy");
});

app.get("/session", async (c) => {
  const session = c.get("session");
  const user = c.get("user");

  if (!user) return c.body(null, 401);

  c.res.headers.set("X-Auth-Discord-Id", user.discordId);
  c.res.headers.set("X-Auth-User-Id", user.id);

  return c.json({
    session,
    user,
  });
});

app.get("/verify-auth", async (c) => {
  const user = c.get("user");

  console.log(user, "user verify-auth");

  if (user) {
    c.res.headers.set("X-Auth-Discord-Id", user.discordId);
    c.res.headers.set("X-Auth-User-Id", user.id);

    return c.json({ status: "OK" });
  }

  const authorizationHeader = c.req.raw.headers.get("authorization");

  console.log("Authorization header", authorizationHeader);

  if (!authorizationHeader) return c.body(null, 401);

  const token = authorizationHeader.replace("Bearer ", "");
  const jwks = (await auth.api.getJwks()) as JwksKeys;

  console.log("Validating token", token);
  console.log(jwks.keys);
  console.log("Issuer", APP_CONFIG.appUrl);
  console.log("Audience", APP_CONFIG.appUrl);

  let discordId, userId;

  try {
    ({ discordId, userId } = await validateToken({
      token,
      jwks,
      issuer: APP_CONFIG.appUrl,
      audience: APP_CONFIG.appUrl,
    }));
  } catch (e) {
    console.error("Error validating token", (e as Error)?.message || e);
    return c.body(null, 401);
  }

  if (!userId || !discordId) return c.body(null, 401);

  c.res.headers.set("X-Auth-Discord-Id", discordId);
  c.res.headers.set("X-Auth-User-Id", userId);

  return c.json({ status: "OK" });
});

app.on(["POST", "GET"], "/idp/**", async (c) => {
  return auth.handler(c.req.raw);
});

const port = APP_CONFIG.port;

console.log(`Server is running on ${APP_CONFIG.appUrl}`);

serve({
  fetch: app.fetch,
  port,
});
