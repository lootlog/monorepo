import type { ApiRequestOptions } from "@lootlog/client/transport";
import { adminConfig } from "./config.js";
import { currentRequest } from "./request-context.js";

/**
 * Options that send a generated auth client call to the auth service as the
 * panel, with the operator's Lootlog session. The auth service decides whether
 * that session belongs to an admin account; the panel never does.
 */
export const asPanel = (): ApiRequestOptions => {
  const config = adminConfig();

  return {
    apiClient: {
      baseUrl: config.authUrl,
      credentials: "omit",
      timeoutMs: 10_000,
    },
    headers: {
      authorization: `Bearer ${config.adminApiSecret}`,
      cookie: currentRequest().cookie,
    },
  };
};
