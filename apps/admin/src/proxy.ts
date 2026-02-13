import { NextResponse, type NextRequest } from "next/server";
import { hasAdminPanelAccessByRoleHeader } from "@/src/lib/auth/admin-access";

const stripAdminBasePath = (pathname: string): string => {
  if (!pathname.startsWith("/admin")) {
    return pathname;
  }

  const withoutBasePath = pathname.slice("/admin".length);
  return withoutBasePath.length > 0 ? withoutBasePath : "/";
};

const isStaticAssetPath = (pathname: string): boolean => {
  const normalizedPathname = stripAdminBasePath(pathname);

  return (
    normalizedPathname.startsWith("/_next/static") ||
    normalizedPathname.startsWith("/_next/image") ||
    normalizedPathname === "/favicon.ico" ||
    normalizedPathname === "/robots.txt" ||
    normalizedPathname === "/sitemap.xml"
  );
};

export const proxy = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin") || isStaticAssetPath(pathname)) {
    return NextResponse.next();
  }

  const roleHeader = request.headers.get("x-auth-user-role");

  if (!hasAdminPanelAccessByRoleHeader(roleHeader)) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
};

export const config = {
  matcher: ["/:path*"],
};
