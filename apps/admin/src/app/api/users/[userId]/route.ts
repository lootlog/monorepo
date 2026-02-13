import { NextResponse } from "next/server";
import { getUser } from "@/src/lib/server/auth-service";
import {
  buildErrorResponse,
  getAuthContextFromRequest,
  requirePermissions,
} from "@/src/lib/server/admin-route";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const deniedResponse = await requirePermissions(request, { user: ["get"] });
  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const { userId } = await params;
    const response = await getUser(getAuthContextFromRequest(request), userId);

    return NextResponse.json(response);
  } catch (error) {
    return buildErrorResponse(error);
  }
}
