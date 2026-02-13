import { NextResponse } from "next/server";
import {
  hasAdminPermissions,
  toErrorResponse,
  writeAdminAuditLog,
} from "@/src/lib/server/auth-service";
import type { AdminPermissions } from "@/src/lib/types/admin";

type AuditMutationInput = {
  request: Request;
  action: string;
  targetUserId?: string | null;
  status: "success" | "error";
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown> | null;
};

const getCookieHeader = (request: Request): string | null => {
  return request.headers.get("cookie");
};

const getOriginHeader = (request: Request): string | null => {
  const explicitOrigin = request.headers.get("origin");
  if (explicitOrigin) {
    return explicitOrigin;
  }

  const forwardedHost =
    request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (!forwardedHost) {
    return null;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol =
    forwardedProto || new URL(request.url).protocol.replace(/:$/, "") || "http";

  return `${protocol}://${forwardedHost}`;
};

const getActorMetadata = (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for");

  return {
    actorUserId: request.headers.get("x-auth-user-id"),
    actorRole: request.headers.get("x-auth-user-role"),
    requestId: request.headers.get("x-request-id"),
    userAgent: request.headers.get("user-agent"),
    ip: forwardedFor ? forwardedFor.split(",")[0]?.trim() || null : null,
  };
};

export const buildErrorResponse = (error: unknown) => {
  const parsed = toErrorResponse(error);
  return NextResponse.json(parsed.body, { status: parsed.status });
};

export const requirePermissions = async (
  request: Request,
  permissions: AdminPermissions,
): Promise<NextResponse | null> => {
  const allowed = await hasAdminPermissions(
    getAuthContextFromRequest(request),
    permissions,
  );

  if (!allowed) {
    return new NextResponse(null, { status: 404 });
  }

  return null;
};

export const getAuthContextFromRequest = (request: Request) => {
  const originHeader = getOriginHeader(request);

  return {
    cookieHeader: getCookieHeader(request),
    originHeader,
    refererHeader: request.headers.get("referer") || originHeader,
  };
};

export const writeMutationAuditLog = async ({
  request,
  action,
  targetUserId = null,
  status,
  before,
  after,
  metadata,
}: AuditMutationInput) => {
  const actor = getActorMetadata(request);

  if (!actor.actorUserId) {
    return;
  }

  try {
    await writeAdminAuditLog({
      actorUserId: actor.actorUserId,
      actorRole: actor.actorRole,
      action,
      targetUserId,
      status,
      before,
      after,
      metadata,
      ip: actor.ip,
      userAgent: actor.userAgent,
      requestId: actor.requestId,
    });
  } catch {
    // Best-effort audit to avoid blocking user-management operations.
  }
};
