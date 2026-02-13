import { NextResponse } from "next/server";
import { banUser, getUser } from "@/src/lib/server/auth-service";
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
    const body = (await request.json()) as {
      banReason?: string;
      banExpiresIn?: number;
    };

    const context = getAuthContextFromRequest(request);
    const before = await getUser(context, userId).catch(() => null);
    const response = await banUser(
      context,
      userId,
      body.banReason,
      body.banExpiresIn,
    );

    await writeMutationAuditLog({
      request,
      action: "user.ban",
      targetUserId: userId,
      status: "success",
      before,
      after: response.user,
      metadata: {
        banReason: body.banReason ?? null,
        banExpiresIn: body.banExpiresIn ?? null,
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    await writeMutationAuditLog({
      request,
      action: "user.ban",
      targetUserId: userId,
      status: "error",
      metadata: {
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
    });

    return buildErrorResponse(error);
  }
}
