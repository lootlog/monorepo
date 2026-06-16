import { API_URL, AUTH_API_URL, BATTLELOG_API_URL } from "@/config/api";
import {
  type ApiError,
  buildRequestUrl,
  executeApiRequest,
} from "@/lib/api-client";
import { applyDevPermissionOverrideHeader } from "@/lib/dev-permission-override";

export type ErrorType<TError> = ApiError<TError>;
export type BodyType<TBody> = TBody;

const resolveBaseUrl = ({
  baseURL,
  envVarName,
  fallbackToWindowOrigin = false,
}: {
  baseURL: string | undefined;
  envVarName: string;
  fallbackToWindowOrigin?: boolean;
}) => {
  if (baseURL) {
    return baseURL;
  }

  if (fallbackToWindowOrigin && typeof window !== "undefined") {
    return window.location.origin;
  }

  const executionContext =
    typeof window === "undefined" ? "when window is unavailable" : "at runtime";

  throw new Error(`${envVarName} must be configured ${executionContext}.`);
};

const executeOrvalFetch = <TData>({
  baseURL,
  envVarName,
  fallbackToWindowOrigin = false,
  path,
  requestInit = {},
}: {
  baseURL: string | undefined;
  envVarName: string;
  fallbackToWindowOrigin?: boolean;
  path: string;
  requestInit?: RequestInit;
}): Promise<TData> => {
  const resolvedBaseUrl = resolveBaseUrl({
    baseURL,
    envVarName,
    fallbackToWindowOrigin,
  });

  const requestUrl = buildRequestUrl({
    baseURL: resolvedBaseUrl,
    path,
  });
  const headers = new Headers(requestInit.headers);
  applyDevPermissionOverrideHeader(headers);

  return executeApiRequest<TData>({
    url: requestUrl,
    method: requestInit.method ?? "GET",
    requestInit: {
      credentials: requestInit.credentials ?? "include",
      ...requestInit,
      headers,
    },
  });
};

export function orvalFetch<TData>(
  path: string,
  requestInit: RequestInit = {},
): Promise<TData> {
  return executeOrvalFetch<TData>({
    baseURL: API_URL,
    envVarName: "VITE_API_URL",
    fallbackToWindowOrigin: true,
    path,
    requestInit,
  });
}

export function orvalFetchAuth<TData>(
  path: string,
  requestInit: RequestInit = {},
): Promise<TData> {
  return executeOrvalFetch<TData>({
    baseURL: AUTH_API_URL,
    envVarName: "VITE_AUTH_SERVICE_URL",
    path,
    requestInit,
  });
}

export function orvalFetchBattlelog<TData>(
  path: string,
  requestInit: RequestInit = {},
): Promise<TData> {
  return executeOrvalFetch<TData>({
    baseURL: BATTLELOG_API_URL,
    envVarName: "VITE_BATTLELOG_API_URL",
    path,
    requestInit,
  });
}
