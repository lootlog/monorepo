import { NextResponse } from "next/server";
import { revokeUserSession } from "@/src/lib/server/auth-service";
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
    session: ["revoke"],
  });

  if (deniedResponse) {
    return deniedResponse;
  }

  const { userId } = await params;

  try {
    const body = (await request.json()) as { sessionToken?: string };

    if (!body.sessionToken) {
      return NextResponse.json(
        { error: "INVALID_REQUEST", details: "sessionToken is required" },
        { status: 400 },
      );
    }

    const response = await revokeUserSession(
      getAuthContextFromRequest(request),
      body.sessionToken,
    );

    await writeMutationAuditLog({
      request,
      action: "session.revoke",
      targetUserId: userId,
      status: "success",
      metadata: {
        sessionTokenPrefix: body.sessionToken.slice(0, 8),
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    await writeMutationAuditLog({
      request,
      action: "session.revoke",
      targetUserId: userId,
      status: "error",
      metadata: {
        error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
      },
    });

    return buildErrorResponse(error);
  }
}
