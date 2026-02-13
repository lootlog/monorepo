import { Hono, type Context } from "hono";
import { APIError } from "better-auth/api";
import { auth } from "../lib/auth.js";
import { APP_CONFIG } from "../config/app.config.js";
import { type JwksKeys, validateToken } from "@lootlog/api-helpers";
import { z } from "zod";
import {
  createAdminAuditLog,
  type AdminAuditStatus,
} from "../lib/audit/admin-audit.repository.js";

const ADMIN_ACCOUNT_IDS = new Set(APP_CONFIG.adminAccountIds);

const normalizeRoles = (role: unknown): string[] => {
  if (Array.isArray(role)) {
    return role
      .filter((entry): entry is string => typeof entry === "string")
      .flatMap((entry) => entry.split(","))
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0);
  }

  if (typeof role === "string") {
    return role
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0);
  }

  return [];
};

const resolveEffectiveRoleHeaderValue = (input: {
  role: unknown;
  userId?: string;
}): string => {
  const roles = normalizeRoles(input.role);
  const uniqueRoles = new Set(roles);

  if (input.userId && ADMIN_ACCOUNT_IDS.has(input.userId)) {
    uniqueRoles.add("admin");
  }

  if (uniqueRoles.size === 0) {
    return "user";
  }

  return Array.from(uniqueRoles).join(",");
};

const auditLogSchema = z.object({
  actorUserId: z.string(),
  actorRole: z.string().nullable().optional(),
  action: z.string(),
  targetUserId: z.string().nullable().optional(),
  status: z.enum(["success", "error"]),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  ip: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  requestId: z.string().nullable().optional(),
});

type VerifyHeaderUser = {
  id: string;
  discordId: string;
  role: unknown;
};

const setForwardAuthHeaders = (c: Context, user: VerifyHeaderUser) => {
  c.res.headers.set("X-Auth-Discord-Id", user.discordId);
  c.res.headers.set("X-Auth-User-Id", user.id);
  c.res.headers.set(
    "X-Auth-User-Role",
    resolveEffectiveRoleHeaderValue({
      userId: user.id,
      role: user.role,
    }),
  );
};

const resolveUserFromBearer = async (
  c: Context,
): Promise<VerifyHeaderUser | null> => {
  const authorizationHeader = c.req.raw.headers.get("authorization");

  if (!authorizationHeader) {
    return null;
  }

  const token = authorizationHeader.replace("Bearer ", "");
  const jwks = (await auth.api.getJwks()) as JwksKeys;

  let discordId, userId, role;

  try {
    ({ discordId, userId, role } = await validateToken({
      token,
      jwks,
      issuer: APP_CONFIG.appUrl,
      audience: APP_CONFIG.appUrl,
    }));
  } catch {
    return null;
  }

  if (!userId || !discordId) {
    return null;
  }

  return {
    id: userId,
    discordId,
    role,
  };
};

const handleVerifyResponse = async (
  c: Context,
  user: VerifyHeaderUser | null,
) => {
  if (user) {
    setForwardAuthHeaders(c, user);
    return c.json({ status: "OK" });
  }

  const bearerUser = await resolveUserFromBearer(c);

  if (!bearerUser) {
    return c.body(null, 401);
  }

  setForwardAuthHeaders(c, bearerUser);

  return c.json({ status: "OK" });
};

const authController = new Hono<{
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
  };
}>();

authController.get("/verify", async (c) => {
  const user = c.get("user");

  return await handleVerifyResponse(
    c,
    user
      ? {
          id: user.id,
          discordId: user.discordId,
          role: user.role,
        }
      : null,
  );
});

authController.get("/verify-sensitive", async (c) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
    query: {
      disableCookieCache: true,
      disableRefresh: true,
    },
  });

  const user = session?.user;

  return await handleVerifyResponse(
    c,
    user
      ? {
          id: user.id,
          discordId: user.discordId,
          role: user.role,
        }
      : null,
  );
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

  const expiresAt = token.expiresAt ? new Date(token.expiresAt) : null;
  if (expiresAt && expiresAt < new Date()) {
    return c.json(
      { error: "IDP token has expired. Please reconnect your account." },
      401,
    );
  }

  return c.json(token.scopes || []);
});

authController.post("/idp-token", async (c) => {
  const body = await c.req.json();
  const { userId } = body;

  if (!userId) {
    return c.json({ error: "INVALID_REQUEST" }, 400);
  }

  let token;
  try {
    token = await auth.api.getAccessToken({
      body: {
        providerId: "discord",
        userId: userId,
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

  const expiresAt = token.expiresAt ? new Date(token.expiresAt) : null;
  if (expiresAt && expiresAt < new Date()) {
    return c.json({ error: "TOKEN_EXPIRED" }, 401);
  }

  return c.json({
    accessToken: token.accessToken,
    expiresIn: expiresAt
      ? Math.floor((expiresAt.getTime() - Date.now()) / 1000)
      : 0,
    scopes: token.scopes || [],
  });
});

authController.post("/internal/admin-audit", async (c) => {
  let parsedBody: z.infer<typeof auditLogSchema>;

  try {
    const body = await c.req.json();
    parsedBody = auditLogSchema.parse(body);
  } catch {
    return c.json({ error: "INVALID_REQUEST" }, 400);
  }

  const requestId = c.req.raw.headers.get("x-request-id");
  const forwardedFor = c.req.raw.headers.get("x-forwarded-for");
  const userAgent = c.req.raw.headers.get("user-agent");

  try {
    await createAdminAuditLog({
      actorUserId: parsedBody.actorUserId,
      actorRole: parsedBody.actorRole ?? null,
      action: parsedBody.action,
      targetUserId: parsedBody.targetUserId ?? null,
      status: parsedBody.status as AdminAuditStatus,
      before: parsedBody.before,
      after: parsedBody.after,
      metadata: parsedBody.metadata ?? null,
      ip: parsedBody.ip ?? forwardedFor ?? null,
      userAgent: parsedBody.userAgent ?? userAgent ?? null,
      requestId: parsedBody.requestId ?? requestId ?? null,
    });
  } catch {
    return c.json({ error: "AUDIT_LOG_WRITE_FAILED" }, 500);
  }

  return c.json({ status: "OK" });
});

export { authController };
