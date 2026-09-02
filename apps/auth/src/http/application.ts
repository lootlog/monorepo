import { BETTER_AUTH_INTERNAL_PATH } from "#src/auth/better-auth-url";

export const normalizeBetterAuthRequest = (
  request: Request,
  betterAuthBaseURL: string,
): Request => {
  const requestURL = new URL(request.url);
  const endpointPath = requestURL.pathname.slice(
    BETTER_AUTH_INTERNAL_PATH.length,
  );
  const canonicalURL = new URL(betterAuthBaseURL);
  canonicalURL.pathname = `${canonicalURL.pathname.replace(/\/+$/u, "")}${endpointPath}`;
  canonicalURL.search = requestURL.search;

  return new Request(canonicalURL, request);
};
