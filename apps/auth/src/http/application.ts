export const normalizeBetterAuthRequest = (request: Request): Request => {
  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();

  if (!forwardedProtocol) return request;

  const url = new URL(request.url);
  url.protocol = `${forwardedProtocol}:`;
  return new Request(url, request);
};
