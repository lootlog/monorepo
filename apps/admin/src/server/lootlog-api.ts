import type { ApiRequestOptions } from "@lootlog/client/transport";
import { adminConfig } from "./config.js";
import { currentRequest } from "./request-context.js";

/** The Cloudflare Access token of the panel, which no other host needs. */
const ACCESS_COOKIE = "CF_Authorization";

const withoutAccessCookie = (cookie: string) =>
  cookie
    .split(";")
    .map((pair) => pair.trim())
    .filter((pair) => pair !== "" && !pair.startsWith(`${ACCESS_COOKIE}=`))
    .join("; ");

/**
 * Options that send a generated main API client call through the edge with
 * the operator's Lootlog session, as the operator's own browser would. The
 * API authorizes the operator itself; the panel adds no authority.
 */
export const asOperator = (): ApiRequestOptions => ({
  apiClient: {
    baseUrl: adminConfig().apiUrl,
    credentials: "omit",
    timeoutMs: 10_000,
  },
  headers: { cookie: withoutAccessCookie(currentRequest().cookie) },
});
