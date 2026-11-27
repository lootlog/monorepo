const MARGONEM_CDN_ORIGIN = "https://micc.garmory-cdn.cloud";

const CDN_PROXY_PREFIX = "/cdn-proxy/obrazki/";

const ALLOWED_ASSET_DIRECTORIES = new Set(["postacie", "npc", "itemy"]);

const ALLOWED_IMAGE_EXTENSIONS = /\.(gif|png|webp|jpe?g)$/iu;

const SAFE_PATH_SEGMENT = /^[a-z0-9._-]+$/iu;

const CACHE_CONTROL_IMMUTABLE = "public, max-age=31536000, immutable";

const CDN_FETCH_TIMEOUT_MS = 5000;

export type CdnProxyFetch = (request: Request) => Promise<Response>;

const resolveSafeCdnAssetPath = (pathname: string): string | null => {
  if (!pathname.startsWith(CDN_PROXY_PREFIX)) {
    return null;
  }

  let decodedRelativePath: string;

  try {
    decodedRelativePath = decodeURIComponent(
      pathname.slice(CDN_PROXY_PREFIX.length),
    );
  } catch {
    return null;
  }

  if (
    !decodedRelativePath ||
    decodedRelativePath.includes("\\") ||
    decodedRelativePath.includes("\0")
  ) {
    return null;
  }

  const segments = decodedRelativePath.split("/").filter(Boolean);

  if (segments.length < 2) {
    return null;
  }

  const [rootDirectory] = segments;

  if (!rootDirectory || !ALLOWED_ASSET_DIRECTORIES.has(rootDirectory)) {
    return null;
  }

  for (const segment of segments) {
    if (
      segment === "." ||
      segment === ".." ||
      !SAFE_PATH_SEGMENT.test(segment)
    ) {
      return null;
    }
  }

  const fileName = segments.at(-1);

  if (!fileName || !ALLOWED_IMAGE_EXTENSIONS.test(fileName)) {
    return null;
  }

  return segments.join("/");
};

export const isCdnProxyRequest = (pathname: string): boolean =>
  pathname.startsWith(CDN_PROXY_PREFIX);

export const handleCdnProxyRequest = async (
  request: Request,
  requestUrl: URL,
  upstreamFetch: CdnProxyFetch = fetch,
): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-methods": "GET, HEAD, OPTIONS",
        "access-control-allow-origin": "*",
        "access-control-max-age": "86400",
      },
    });
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        allow: "GET, HEAD, OPTIONS",
      },
    });
  }

  const safeAssetPath = resolveSafeCdnAssetPath(requestUrl.pathname);

  if (!safeAssetPath) {
    return new Response("Not Found", { status: 404 });
  }

  const upstreamUrl = new URL(`/obrazki/${safeAssetPath}`, MARGONEM_CDN_ORIGIN);

  try {
    const upstreamResponse = await upstreamFetch(
      new Request(upstreamUrl, {
        method: request.method,
        headers: {
          accept: "image/*,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(CDN_FETCH_TIMEOUT_MS),
      }),
    );

    if (!upstreamResponse.ok) {
      return new Response(null, {
        status: upstreamResponse.status,
        headers: {
          "access-control-allow-origin": "*",
          "cache-control": "public, max-age=300",
        },
      });
    }

    const contentType = upstreamResponse.headers.get("content-type") ?? "";

    if (!contentType.toLowerCase().startsWith("image/")) {
      return new Response("Unsupported Media Type", { status: 415 });
    }

    return new Response(
      request.method === "HEAD" ? null : upstreamResponse.body,
      {
        status: 200,
        headers: {
          "access-control-allow-origin": "*",
          "cache-control": CACHE_CONTROL_IMMUTABLE,
          "content-type": contentType,
          "cross-origin-resource-policy": "cross-origin",
          "x-content-type-options": "nosniff",
        },
      },
    );
  } catch {
    return new Response("Bad Gateway", { status: 502 });
  }
};
