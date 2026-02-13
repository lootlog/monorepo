import { NextResponse } from "next/server";
import { getUser, unbanUser } from "@/src/lib/server/auth-service";
import {
  buildErrorResponse,
  getAuthContextFromRequest,
  requirePermissions,
  writeMutationAuditLog,
} from "@/src/lib/server/admin-route";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const deniedResponse = await requirePermissions(request, {
    user: ["ban"],
  });

  if (deniedResponse) {
    return deniedResponse;
  }

  const { userId } = await params;

  try {
    const context = getAuthContextFromRequest(request);
    const before = await getUser(context, userId).catch(() => null);
    const response = await unbanUser(context, userId);

    await writeMutationAuditLog({
      request,
      action: "user.unban",
      targetUserId: userId,
      status: "success",
      before,
      after: response.user,
    });

    return NextResponse.json(response);
  } catch (error) {
    await writeMutationAuditLog({
      request,
      action: "user.unban",
      targetUserId: userId,
      status: "error",
      metadata: {
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
    });

    return buildErrorResponse(error);
  }
}
