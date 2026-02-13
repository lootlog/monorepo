import { NextResponse } from "next/server";
import { getUser, setUserRole } from "@/src/lib/server/auth-service";
import {
  buildErrorResponse,
  getAuthContextFromRequest,
  requirePermissions,
  writeMutationAuditLog,
} from "@/src/lib/server/admin-route";

const AVAILABLE_ROLES = new Set(["user", "admin", "developer", "moderator"]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const deniedResponse = await requirePermissions(request, {
    user: ["set-role"],
  });

  if (deniedResponse) {
    return deniedResponse;
  }

  const { userId } = await params;

  try {
    const { role } = (await request.json()) as { role?: string };

    if (!role || !AVAILABLE_ROLES.has(role)) {
      return NextResponse.json(
        {
          error: "INVALID_ROLE",
          details: `Allowed roles: ${Array.from(AVAILABLE_ROLES).join(", ")}`,
        },
        { status: 400 },
      );
    }

    const context = getAuthContextFromRequest(request);
    const before = await getUser(context, userId).catch(() => null);
    const response = await setUserRole(context, userId, role);

    await writeMutationAuditLog({
      request,
      action: "user.set-role",
      targetUserId: userId,
      status: "success",
      before,
      after: response.user,
      metadata: { role },
    });

    return NextResponse.json(response);
  } catch (error) {
    await writeMutationAuditLog({
      request,
      action: "user.set-role",
      targetUserId: userId,
      status: "error",
      metadata: {
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
    });

    return buildErrorResponse(error);
  }
}
