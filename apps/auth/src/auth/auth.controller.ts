import { Hono } from "hono";
import { APIError } from "better-auth/api";
import { auth } from "../lib/auth.js";
import { APP_CONFIG } from "../config/app.config.js";
import { type JwksKeys, validateToken } from "@lootlog/hono-shared";

const authController = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

const normalizeScopes = (scopes: unknown): string[] => {
  if (Array.isArray(scopes)) {
    return scopes.filter((scope): scope is string => typeof scope === "string");
  }

  if (typeof scopes === "string") {
    return scopes.split(/\s+/).filter(Boolean);
  }

  return [];
};

authController.get("/verify", async (c) => {
  if (
    c.req.raw.headers.has("X-Auth-Discord-Id") ||
    c.req.raw.headers.has("X-Auth-User-Id")
  ) {
    return c.body(null, 401);
  }

  const user = c.get("user");

  if (user) {
    c.res.headers.set("X-Auth-Discord-Id", user.discordId);
    c.res.headers.set("X-Auth-User-Id", user.id);

    return c.json({ status: "OK" });
  }

  const authorizationHeader = c.req.raw.headers.get("authorization");

  if (!authorizationHeader) return c.body(null, 401);

  const token = authorizationHeader.replace("Bearer ", "");
  const jwks = (await auth.api.getJwks()) as JwksKeys;

  let discordId, userId;

  try {
    ({ discordId, userId } = await validateToken({
      token,
      jwks,
      issuer: APP_CONFIG.appUrl,
      audience: APP_CONFIG.appUrl,
    }));
  } catch {
    return c.body(null, 401);
  }

  if (!userId || !discordId) return c.body(null, 401);

  c.res.headers.set("X-Auth-Discord-Id", discordId);
  c.res.headers.set("X-Auth-User-Id", userId);

  return c.json({ status: "OK" });
});

authController.get("/@me/scopes", async (c) => {
  const user = c.get("user");

  if (!user) return c.body(null, 401);

  let token;
  try {
    token = await auth.api.getAccessToken({
      body: {
        providerId: "discord",
        userId: user.id,
        accountId: user.discordId,
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      return c.json({ error: error.message }, error.status as 400 | 500);
    }
    return c.json({ error: "Failed to retrieve IDP token" }, 500);
  }

  if (!token || !token.accessToken) {
    return c.json({ error: "Failed to retrieve IDP token" }, 400);
  }

  const expiresAt = token.accessTokenExpiresAt
    ? new Date(token.accessTokenExpiresAt)
    : null;
  if (expiresAt && expiresAt < new Date()) {
    return c.json(
      { error: "IDP token has expired. Please reconnect your account." },
      401,
    );
  }

  return c.json(normalizeScopes(token.scopes));
});

authController.post("/idp-token", async (c) => {
  const body = await c.req.json();
  const { userId, discordId } = body;

  if (!userId || !discordId) {
    return c.json({ error: "INVALID_REQUEST" }, 400);
  }

  let token;
  try {
    token = await auth.api.getAccessToken({
      body: {
        providerId: "discord",
        userId: userId,
        accountId: discordId,
      },
    });
  } catch (error) {
    if (error instanceof APIError) {
      return c.json({ error: "ACCOUNT_NOT_FOUND" }, error.status as 400 | 500);
    }
    return c.json({ error: "INTERNAL_ERROR" }, 500);
  }

  if (!token || !token.accessToken) {
    return c.json({ error: "TOKEN_NOT_FOUND" }, 400);
  }

  const expiresAt = token.accessTokenExpiresAt
    ? new Date(token.accessTokenExpiresAt)
    : null;
  if (expiresAt && expiresAt < new Date()) {
    return c.json({ error: "TOKEN_EXPIRED" }, 401);
  }

  return c.json({
    accessToken: token.accessToken,
    expiresIn: expiresAt
      ? Math.floor((expiresAt.getTime() - Date.now()) / 1000)
      : 0,
    scopes: normalizeScopes(token.scopes),
  });
});

export { authController };
