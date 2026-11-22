import type { ApiRequestOptions } from "@lootlog/client/transport";
import { adminConfig } from "./config.js";
import { currentRequest } from "./request-context.js";

const ACCESS_COOKIE = "CF_Authorization";

const withoutAccessCookie = (cookie: string) =>
  cookie
    .split(";")
    .map((pair) => pair.trim())
    .filter((pair) => pair !== "" && !pair.startsWith(`${ACCESS_COOKIE}=`))
    .join("; ");

export const asOperator = (): ApiRequestOptions => ({
  apiClient: {
    baseUrl: adminConfig().apiUrl,
    credentials: "omit",
    timeoutMs: 10_000,
  },
  headers: { cookie: withoutAccessCookie(currentRequest().cookie) },
});
