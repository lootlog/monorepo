import { Context, Next } from "hono";
import { auth } from "../auth.js";

const sessionMiddleware = async (c: Context, next: Next) => {
  if (c.req.path === "/auth/verify-sensitive") {
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return next();
  }

  c.set("user", session.user);
  c.set("session", session.session);

  return next();
};

export { sessionMiddleware };
