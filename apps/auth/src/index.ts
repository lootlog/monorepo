import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { APP_CONFIG } from "./config/app.config.js";
import { cors } from "hono/cors";
import { auth } from "./lib/auth.js";
import { logger } from "hono/logger";
import { verifyToken } from "./lib/middleware/bearer-jwt-auth.js";

const app = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "http://localhost", // replace with your origin
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["POST", "GET", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

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
  const authorizationHeader = c.req.raw.headers.get("authorization");

  if (authorizationHeader) {
    const token = authorizationHeader.replace("Bearer ", "");
    const { discordId, userId } = await verifyToken(token);

    if (!userId || !discordId) return c.body(null, 401);

    c.res.headers.set("X-Auth-Discord-Id", discordId);
    c.res.headers.set("X-Auth-User-Id", userId);

    return c.json({ status: "OK" });
  }

  const user = c.get("user");

  if (!user) return c.body(null, 401);

  c.res.headers.set("X-Auth-Discord-Id", user.discordId);
  c.res.headers.set("X-Auth-User-Id", user.id);

  return c.json({ status: "OK" });
});

app.on(["POST", "GET"], "/api/auth/**", (c) => {
  return auth.handler(c.req.raw);
});

const port = APP_CONFIG.port;

console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
