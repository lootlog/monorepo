import { Hono } from "hono";
import { auth } from "../lib/auth.js";
import { APP_CONFIG } from "../config/app.config.js";
import { JwksKeys, validateToken } from "@lootlog/api-helpers";

const authController = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

authController.get("/verify", async (c) => {
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
  } catch (e) {
    console.error("Error validating token", (e as Error)?.message || e);
    return c.body(null, 401);
  }

  if (!userId || !discordId) return c.body(null, 401);

  c.res.headers.set("X-Auth-Discord-Id", discordId);
  c.res.headers.set("X-Auth-User-Id", userId);

  return c.json({ status: "OK" });
});

export { authController };
