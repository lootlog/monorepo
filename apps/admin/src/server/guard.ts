import { ACCESS_TOKEN_HEADER } from "./access.js";
import type { AdminConfig } from "./config.js";

const SAFE_METHODS = new Set(["GET", "HEAD"]);

const contentSecurityPolicy = (nonce: string) =>
  [
    "default-src 'none'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' https://cdn.discordapp.com",
    "connect-src 'self'",
    "form-action 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join("; ");

const BASE_HEADERS = {
  "cache-control": "no-store, no-transform",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "permissions-policy": "camera=(), geolocation=(), microphone=()",
  "referrer-policy": "same-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "x-robots-tag": "noindex, nofollow",
};

export const securityHeaders = (production: boolean, nonce: string) =>
  production
    ? {
        ...BASE_HEADERS,
        "content-security-policy": contentSecurityPolicy(nonce),
      }
    : BASE_HEADERS;

const refuse = (status: 401 | 403, message: string) =>
  new Response(`${message}\n`, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });

export const authorizeRequest = async (
  request: Request,
  config: AdminConfig,
  verifyAccessToken: (
    token: string,
    access: NonNullable<AdminConfig["access"]>,
  ) => Promise<string | undefined>,
): Promise<{ readonly operator: string } | { readonly response: Response }> => {
  if (!SAFE_METHODS.has(request.method)) {
    const fetchSite = request.headers.get("sec-fetch-site");

    if (
      request.headers.get("origin") !== config.origin ||
      (fetchSite !== null && fetchSite !== "same-origin")
    )
      return { response: refuse(403, "Cross-site request refused") };
  }

  if (!config.access) {
    return config.devOperator
      ? { operator: config.devOperator }
      : { response: refuse(401, "Sign-in required") };
  }

  const token = request.headers.get(ACCESS_TOKEN_HEADER);

  const email = token
    ? await verifyAccessToken(token, config.access)
    : undefined;

  if (!email) return { response: refuse(401, "Sign-in required") };

  return config.operatorEmails.has(email)
    ? { operator: email }
    : { response: refuse(403, "Not an operator") };
};
