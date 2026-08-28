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
const legacyDocsAssetRoot = "/__legacy-assets/docs";
const legacyLandingAssetRoot = "/__legacy-assets/landing";
const legacyAssetProbeOrder: Upstream[] = ["web", "landing", "docs"];

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
    isPathWithin(pathname, legacyLandingAssetRoot) ||
    isPathWithin(pathname, "/landing-assets") ||
    isPathWithin(pathname, "/screenshots")
  ) {
    return "landing";
  }

  if (
    isPathWithin(pathname, "/docs") ||
    isPathWithin(pathname, "/docs-assets") ||
    isPathWithin(pathname, legacyDocsAssetRoot) ||
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
  const refererUrl = getSameOriginReferer(requestUrl, referer);
  if (!refererUrl) {
    return "web";
  }

  return selectPageUpstream(refererUrl.pathname);
}

function getSameOriginReferer(
  requestUrl: URL,
  referer: string | null,
): URL | null {
  if (!referer) {
    return null;
  }

  try {
    const refererUrl = new URL(referer);
    return refererUrl.origin === requestUrl.origin ? refererUrl : null;
  } catch {
    return null;
  }
}

function getAmbiguousLegacyAssetReferer(
  request: Request,
  requestUrl: URL,
): URL | null {
  if (!isPathWithin(requestUrl.pathname, "/assets")) {
    return null;
  }

  const refererUrl = getSameOriginReferer(
    requestUrl,
    request.headers.get("referer"),
  );

  return refererUrl && isPathWithin(refererUrl.pathname, "/assets")
    ? refererUrl
    : null;
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

function getLegacyAssetRoot(upstream: Upstream): string | null {
  switch (upstream) {
    case "docs":
      return legacyDocsAssetRoot;
    case "landing":
      return legacyLandingAssetRoot;
    case "web":
      return null;
  }
}

function createLegacyAssetRedirect(
  requestUrl: URL,
  upstream: Upstream,
): Response | null {
  if (!isPathWithin(requestUrl.pathname, "/assets")) {
    return null;
  }

  const legacyAssetRoot = getLegacyAssetRoot(upstream);
  if (!legacyAssetRoot) {
    return null;
  }

  const redirectUrl = new URL(requestUrl);
  redirectUrl.pathname = `${legacyAssetRoot}${requestUrl.pathname}`;

  return new Response(null, {
    headers: {
      "cache-control": "private, no-store",
      location: redirectUrl.href,
      vary: "Referer",
    },
    status: 307,
  });
}

function getUpstreamPathname(pathname: string): string {
  for (const legacyAssetRoot of [legacyDocsAssetRoot, legacyLandingAssetRoot]) {
    if (isPathWithin(pathname, legacyAssetRoot)) {
      return pathname.slice(legacyAssetRoot.length);
    }
  }

  return pathname;
}

function createLegacyAssetProbeRequest(
  request: Request,
  refererUrl: URL,
  origin: string,
): Request {
  const upstreamUrl = new URL(origin);
  upstreamUrl.pathname = refererUrl.pathname;
  upstreamUrl.search = refererUrl.search;
  upstreamUrl.hash = "";
  const headers = new Headers(request.headers);

  for (const header of credentialHeaders) {
    headers.delete(header);
  }
  headers.delete("content-length");

  return new Request(upstreamUrl, {
    headers,
    method: "HEAD",
  });
}

function isStaticAssetResponse(response: Response): boolean {
  if (!response.ok) {
    return false;
  }

  const contentType = response.headers.get("content-type")?.toLowerCase();
  return !contentType?.startsWith("text/html");
}

async function resolveAmbiguousLegacyAssetUpstream(
  request: Request,
  refererUrl: URL,
  environment: TrafficSplitterEnvironment,
  upstreamFetch: UpstreamFetch,
): Promise<Upstream> {
  const probes = await Promise.all(
    legacyAssetProbeOrder.map(async (upstream) => {
      try {
        return {
          response: await upstreamFetch(
            createLegacyAssetProbeRequest(
              request,
              refererUrl,
              getUpstreamOrigin(upstream, environment),
            ),
          ),
          upstream,
        };
      } catch {
        return { response: null, upstream };
      }
    }),
  );

  return (
    probes.find(({ response }) => response && isStaticAssetResponse(response))
      ?.upstream ?? "web"
  );
}

function createUpstreamRequest(request: Request, origin: string): Request {
  const requestUrl = new URL(request.url);
  const upstreamUrl = new URL(origin);
  upstreamUrl.pathname = getUpstreamPathname(requestUrl.pathname);
  upstreamUrl.search = requestUrl.search;
  upstreamUrl.hash = "";
  const upstreamRequest = new Request(upstreamUrl, request);

  for (const header of credentialHeaders) {
    upstreamRequest.headers.delete(header);
  }

  return upstreamRequest;
}

export async function routeRequest(
  request: Request,
  environment: TrafficSplitterEnvironment,
  upstreamFetch: UpstreamFetch = fetch,
): Promise<Response> {
  const requestUrl = new URL(request.url);
  const ambiguousLegacyAssetReferer = getAmbiguousLegacyAssetReferer(
    request,
    requestUrl,
  );
  const canProbeLegacyAsset =
    request.method === "GET" || request.method === "HEAD";
  const upstream =
    ambiguousLegacyAssetReferer && canProbeLegacyAsset
      ? await resolveAmbiguousLegacyAssetUpstream(
          request,
          ambiguousLegacyAssetReferer,
          environment,
          upstreamFetch,
        )
      : selectUpstream(request, requestUrl);
  const legacyAssetRedirect = createLegacyAssetRedirect(requestUrl, upstream);
  if (legacyAssetRedirect) {
    return legacyAssetRedirect;
  }

  const upstreamOrigin = getUpstreamOrigin(upstream, environment);

  return upstreamFetch(createUpstreamRequest(request, upstreamOrigin));
}

export default {
  fetch(request: Request, environment: TrafficSplitterEnvironment) {
    return routeRequest(request, environment);
  },
};
