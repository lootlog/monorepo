import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { verifyAccessToken } from "./server/access.js";
import { adminConfig } from "./server/config.js";
import { authorizeRequest, securityHeaders } from "./server/guard.js";
import { runRequest } from "./server/request-context.js";

const secured = (response: Response, nonce: string) => {
  const securedResponse = new Response(response.body, response);
  const headers = securityHeaders(import.meta.env.PROD, nonce);

  for (const [name, value] of Object.entries(headers))
    securedResponse.headers.set(name, value);

  return securedResponse;
};

// Read once at start, so a half-configured panel fails to start instead of
// passing its health check and refusing every request.
const config = adminConfig();

/** Every request passes the guard before any route or server function runs. */
export default createServerEntry({
  async fetch(request) {
    const nonce = crypto.getRandomValues(new Uint8Array(16)).toBase64();

    const decision = await authorizeRequest(request, config, verifyAccessToken);

    if ("response" in decision) return secured(decision.response, nonce);

    return secured(
      await runRequest(
        {
          cookie: request.headers.get("cookie") ?? "",
          nonce,
        },
        () => handler.fetch(request),
      ),
      nonce,
    );
  },
});
