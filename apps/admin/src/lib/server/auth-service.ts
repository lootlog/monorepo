import type {
  AdminPermissions,
  AdminUser,
  AdminUsersListResponse,
  AdminUserSessionsResponse,
} from "@/src/lib/types/admin";

type RequestContext = {
  cookieHeader?: string | null;
  originHeader?: string | null;
  refererHeader?: string | null;
};

type AuthRequestOptions = RequestContext & {
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
};

type AuditStatus = "success" | "error";

type AuditLogInput = {
  actorUserId: string;
  actorRole: string | null;
  action: string;
  targetUserId?: string | null;
  status: AuditStatus;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
};

const DEFAULT_AUTH_SERVICE_URL = "http://localhost:4001";
const AUTH_SERVICE_URL = (
  process.env.AUTH_SERVICE_URL || DEFAULT_AUTH_SERVICE_URL
).replace(/\/$/, "");

const buildHeaders = (context: RequestContext): HeadersInit => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (context.cookieHeader) {
    headers.Cookie = context.cookieHeader;
  }

  if (context.originHeader) {
    headers.Origin = context.originHeader;
  }

  if (context.refererHeader) {
    headers.Referer = context.refererHeader;
  }

  return headers;
};

const withRequestContext = (context: RequestContext): RequestContext => {
  return {
    cookieHeader: context.cookieHeader,
    originHeader: context.originHeader,
    refererHeader: context.refererHeader,
  };
};

const extractErrorMessage = (payload: unknown): string => {
  if (!payload || typeof payload !== "object") {
    return "AUTH_SERVICE_ERROR";
  }

  if ("message" in payload && typeof payload.message === "string") {
    return payload.message;
  }

  if ("error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  return "AUTH_SERVICE_ERROR";
};

export class AuthServiceError extends Error {
  constructor(
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(extractErrorMessage(payload));
    this.name = "AuthServiceError";
  }
}

const authRequest = async <T>({
  path,
  method = "GET",
  body,
  originHeader,
  refererHeader,
  cookieHeader,
}: AuthRequestOptions): Promise<T> => {
  const response = await fetch(`${AUTH_SERVICE_URL}${path}`, {
    method,
    headers: buildHeaders({ cookieHeader, originHeader, refererHeader }),
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const rawText = await response.text();
  let payload: unknown = null;

  if (rawText) {
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch {
      payload = rawText;
    }
  }

  if (!response.ok) {
    throw new AuthServiceError(response.status, payload);
  }

  return payload as T;
};

export const hasAdminPermissions = async (
  context: RequestContext,
  permissions: AdminPermissions,
): Promise<boolean> => {
  try {
    const response = await authRequest<{ success: boolean }>({
      path: "/idp/admin/has-permission",
      method: "POST",
      body: { permissions },
      ...withRequestContext(context),
    });

    return response.success === true;
  } catch (error) {
    if (
      error instanceof AuthServiceError &&
      (error.status === 401 || error.status === 403)
    ) {
      return false;
    }

    throw error;
  }
};

export const listUsers = async (
  context: RequestContext,
  query: URLSearchParams,
): Promise<AdminUsersListResponse> => {
  const searchQuery = query.toString();

  return await authRequest<AdminUsersListResponse>({
    path: `/idp/admin/list-users${searchQuery ? `?${searchQuery}` : ""}`,
    method: "GET",
    ...withRequestContext(context),
  });
};

export const getUser = async (
  context: RequestContext,
  userId: string,
): Promise<AdminUser> => {
  return await authRequest<AdminUser>({
    path: `/idp/admin/get-user?id=${encodeURIComponent(userId)}`,
    method: "GET",
    ...withRequestContext(context),
  });
};

export const setUserRole = async (
  context: RequestContext,
  userId: string,
  role: string,
): Promise<{ user: AdminUser }> => {
  return await authRequest<{ user: AdminUser }>({
    path: "/idp/admin/set-role",
    method: "POST",
    body: { userId, role },
    ...withRequestContext(context),
  });
};

export const banUser = async (
  context: RequestContext,
  userId: string,
  banReason?: string,
  banExpiresIn?: number,
): Promise<{ user: AdminUser }> => {
  return await authRequest<{ user: AdminUser }>({
    path: "/idp/admin/ban-user",
    method: "POST",
    body: {
      userId,
      banReason,
      banExpiresIn,
    },
    ...withRequestContext(context),
  });
};

export const unbanUser = async (
  context: RequestContext,
  userId: string,
): Promise<{ user: AdminUser }> => {
  return await authRequest<{ user: AdminUser }>({
    path: "/idp/admin/unban-user",
    method: "POST",
    body: { userId },
    ...withRequestContext(context),
  });
};

export const listUserSessions = async (
  context: RequestContext,
  userId: string,
): Promise<AdminUserSessionsResponse> => {
  return await authRequest<AdminUserSessionsResponse>({
    path: "/idp/admin/list-user-sessions",
    method: "POST",
    body: { userId },
    ...withRequestContext(context),
  });
};

export const revokeUserSession = async (
  context: RequestContext,
  sessionToken: string,
): Promise<{ success: boolean }> => {
  return await authRequest<{ success: boolean }>({
    path: "/idp/admin/revoke-user-session",
    method: "POST",
    body: { sessionToken },
    ...withRequestContext(context),
  });
};

export const writeAdminAuditLog = async (payload: AuditLogInput) => {
  await authRequest<{ status: string }>({
    path: "/auth/internal/admin-audit",
    method: "POST",
    body: payload,
  });
};

export const toErrorResponse = (error: unknown) => {
  if (error instanceof AuthServiceError) {
    return {
      status: error.status,
      body: {
        error: error.message,
        details: error.payload,
      },
    };
  }

  return {
    status: 500,
    body: {
      error: "INTERNAL_ERROR",
    },
  };
};
