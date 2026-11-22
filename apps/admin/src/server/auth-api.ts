import type { ApiRequestOptions } from "@lootlog/client/transport";
import { adminConfig } from "./config.js";
import { currentRequest } from "./request-context.js";

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
