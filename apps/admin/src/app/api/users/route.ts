import { NextResponse } from "next/server";
import { listUsers } from "@/src/lib/server/auth-service";
import {
  buildErrorResponse,
  getAuthContextFromRequest,
  requirePermissions,
} from "@/src/lib/server/admin-route";

export async function GET(request: Request) {
  const deniedResponse = await requirePermissions(request, { user: ["list"] });
  if (deniedResponse) {
    return deniedResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const response = await listUsers(
      getAuthContextFromRequest(request),
      searchParams,
    );

    return NextResponse.json(response);
  } catch (error) {
    return buildErrorResponse(error);
  }
}
