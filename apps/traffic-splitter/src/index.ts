export interface TrafficSplitterEnvironment {
  DOCS_ORIGIN: string;
  LANDING_ORIGIN: string;
  WEB_ORIGIN: string;
}

export type UpstreamFetch = (request: Request) => Promise<Response>;

type Upstream = "docs" | "landing" | "web";

const landingDocuments = new Set(["/", "/privacy-policy", "/terms-of-service"]);
const landingFiles = new Set(["/apple-icon.png", "/favicon.ico", "/icon.svg"]);
const credentialHeaders = ["authorization", "cookie", "proxy-authorization"];

function normalizeDocumentPath(pathname: string): string {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/u, "");
}

function isPathWithin(pathname: string, root: string): boolean {
  return pathname === root || pathname.startsWith(`${root}/`);
}

function selectPageUpstream(pathname: string): Upstream {
  const documentPath = normalizeDocumentPath(pathname);

  if (
    landingDocuments.has(documentPath) ||
    landingFiles.has(pathname) ||
    isPathWithin(pathname, "/brand") ||
    isPathWithin(pathname, "/landing-assets") ||
    isPathWithin(pathname, "/screenshots")
  ) {
    return "landing";
  }

  if (
    isPathWithin(pathname, "/docs") ||
    isPathWithin(pathname, "/docs-assets") ||
    isPathWithin(pathname, "/__tsr") ||
    documentPath === "/api/search"
  ) {
    return "docs";
  }

  return "web";
}

function selectLegacyAssetUpstream(
  requestUrl: URL,
  referer: string | null,
): Upstream {
  if (!referer) {
    return "web";
  }

  try {
    const refererUrl = new URL(referer);
    if (refererUrl.origin !== requestUrl.origin) {
      return "web";
    }

    return selectPageUpstream(refererUrl.pathname);
  } catch {
    return "web";
  }
}

function selectUpstream(request: Request, requestUrl: URL): Upstream {
  if (isPathWithin(requestUrl.pathname, "/assets")) {
    return selectLegacyAssetUpstream(
      requestUrl,
      request.headers.get("referer"),
    );
  }

  return selectPageUpstream(requestUrl.pathname);
}

function getUpstreamOrigin(
  upstream: Upstream,
  environment: TrafficSplitterEnvironment,
): string {
  switch (upstream) {
    case "docs":
      return environment.DOCS_ORIGIN;
    case "landing":
      return environment.LANDING_ORIGIN;
    case "web":
      return environment.WEB_ORIGIN;
  }
}

function createUpstreamRequest(request: Request, origin: string): Request {
  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(
    `${requestUrl.pathname}${requestUrl.search}`,
    origin,
  );
  const upstreamRequest = new Request(upstreamUrl, request);

  for (const header of credentialHeaders) {
    upstreamRequest.headers.delete(header);
  }

  return upstreamRequest;
}

export function routeRequest(
  request: Request,
  environment: TrafficSplitterEnvironment,
  upstreamFetch: UpstreamFetch = fetch,
): Promise<Response> {
  const requestUrl = new URL(request.url);
  const upstream = selectUpstream(request, requestUrl);
  const upstreamOrigin = getUpstreamOrigin(upstream, environment);

  return upstreamFetch(createUpstreamRequest(request, upstreamOrigin));
}

export default {
  fetch(request: Request, environment: TrafficSplitterEnvironment) {
    return routeRequest(request, environment);
  },
};
