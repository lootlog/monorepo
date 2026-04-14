import { stringify } from "qs";
import {
  ACTIVITY_API_URL,
  API_URL,
  AUTH_API_URL,
  BATTLELOG_API_URL,
} from "@/config/api";
import { DISCORD_AUTH_SCOPES } from "@lootlog/types";
import { authClient } from "@/lib/auth-client";

type ApiName = "default" | "battlelog" | "auth" | "activity";

type ApiErrorLike = {
  message?: string | string[];
  requiresReauth?: boolean;
};

type ApiRequestBody = unknown;

export type ApiRequestConfig = Omit<RequestInit, "body" | "method"> & {
  params?: Record<string, unknown>;
};

export class ApiError<TData = unknown> extends Error {
  public readonly status?: number;
  public readonly data: TData | undefined;
  public readonly url: string;
  public readonly method: string;

  public constructor({
    status,
    data,
    url,
    method,
    message,
  }: {
    status?: number;
    data?: TData;
    url: string;
    method: string;
    message: string;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.url = url;
    this.method = method;
  }
}

export type ApiClient = {
  get<T>(url: string, config?: ApiRequestConfig): Promise<T>;
  post<T>(
    url: string,
    body?: ApiRequestBody,
    config?: ApiRequestConfig,
  ): Promise<T>;
  put<T>(
    url: string,
    body?: ApiRequestBody,
    config?: ApiRequestConfig,
  ): Promise<T>;
  patch<T>(
    url: string,
    body?: ApiRequestBody,
    config?: ApiRequestConfig,
  ): Promise<T>;
  delete<T>(url: string, config?: ApiRequestConfig): Promise<T>;
};

const BASE_URLS: Record<ApiName, string | undefined> = {
  default: API_URL,
  battlelog: BATTLELOG_API_URL,
  auth: AUTH_API_URL,
  activity: ACTIVITY_API_URL,
};

const clients = new Map<ApiName, ApiClient>();

let reauthPromise: Promise<void> | null = null;

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const isApiErrorData = (value: unknown): value is ApiErrorLike => {
  return isObject(value);
};

const isBinaryBody = (body: unknown): body is BodyInit => {
  return (
    typeof body === "string" ||
    body instanceof Blob ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer ||
    ArrayBuffer.isView(body)
  );
};

const getApiMessageFromData = (data: unknown): string | undefined => {
  if (typeof data === "string") {
    return data.trim().length > 0 ? data : undefined;
  }

  if (!isApiErrorData(data)) {
    return undefined;
  }

  const rawMessage = data.message;
  const normalizedMessage = Array.isArray(rawMessage)
    ? rawMessage[0]
    : rawMessage;

  if (typeof normalizedMessage !== "string") {
    return undefined;
  }

  return normalizedMessage.trim().length > 0 ? normalizedMessage : undefined;
};

const parseResponseBody = (
  responseText: string,
  contentType: string | null,
) => {
  if (responseText.length === 0) {
    return undefined;
  }

  const isJsonResponse =
    contentType?.includes("application/json") || contentType?.includes("+json");

  if (!isJsonResponse) {
    return responseText;
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
};

const isAbsoluteUrl = (value: string) => {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(value);
};

const normalizeBaseUrl = (baseURL: string) => {
  return baseURL.endsWith("/") ? baseURL : `${baseURL}/`;
};

const normalizeRequestPath = (path: string) => {
  return path.replace(/^\/+/, "");
};

export const buildRequestUrl = ({
  baseURL,
  path,
  params,
}: {
  baseURL: string;
  path: string;
  params?: Record<string, unknown>;
}) => {
  const url = isAbsoluteUrl(path)
    ? new URL(path)
    : new URL(normalizeRequestPath(path), normalizeBaseUrl(baseURL));
  const serializedParams = params
    ? stringify(params, {
        addQueryPrefix: false,
        arrayFormat: "repeat",
        skipNulls: true,
      })
    : "";

  if (serializedParams.length > 0) {
    url.search = serializedParams;
  }

  return url;
};

export const executeApiRequest = async <T>({
  url,
  method,
  requestInit = {},
}: {
  url: URL;
  method: string;
  requestInit?: RequestInit;
}): Promise<T> => {
  let response: Response;

  try {
    response = await fetch(url, {
      ...requestInit,
      method,
      credentials: requestInit.credentials ?? "include",
    });
  } catch (error) {
    throw new ApiError({
      status: undefined,
      data: undefined,
      url: url.toString(),
      method,
      message:
        error instanceof Error ? error.message : "Network request failed",
    });
  }

  const responseText = await response.text();
  const responseData = parseResponseBody(
    responseText,
    response.headers.get("content-type"),
  );

  if (response.ok) {
    return responseData as T;
  }

  handleApiErrorSideEffects({
    status: response.status,
    data: responseData,
    isPublicEndpoint: url.pathname.includes("/public/"),
  });

  throw new ApiError({
    status: response.status,
    data: responseData,
    url: url.toString(),
    method,
    message:
      getApiMessageFromData(responseData) ??
      response.statusText ??
      "Request failed",
  });
};

const handleReauthentication = (): Promise<void> => {
  if (reauthPromise) {
    return reauthPromise;
  }

  reauthPromise = authClient.signIn
    .social({
      provider: "discord",
      callbackURL: window.location.href,
      scopes: DISCORD_AUTH_SCOPES,
    })
    .then(() => undefined)
    .catch((error) => {
      console.warn("Reauthentication failed:", error);
      throw error;
    })
    .finally(() => {
      reauthPromise = null;
    });

  return reauthPromise;
};

const handleApiErrorSideEffects = ({
  status,
  data,
  isPublicEndpoint,
}: {
  status?: number;
  data: unknown;
  isPublicEndpoint: boolean;
}) => {
  const requiresReauth = isApiErrorData(data) && data.requiresReauth === true;

  if ((status === 401 || requiresReauth) && !isPublicEndpoint) {
    void handleReauthentication();
  }
};

const createApiClient = (api: ApiName): ApiClient => {
  const baseURL = BASE_URLS[api] ?? API_URL;

  const request = <T>(
    method: string,
    path: string,
    body?: ApiRequestBody,
    config: ApiRequestConfig = {},
  ): Promise<T> => {
    const { params, headers: headerInit, credentials, ...requestInit } = config;
    const url = buildRequestUrl({ baseURL, path, params });
    const headers = new Headers(headerInit);

    let requestBody: BodyInit | undefined;

    if (body !== undefined && body !== null) {
      if (isBinaryBody(body)) {
        requestBody = body;
      } else {
        requestBody = JSON.stringify(body);
        if (!headers.has("content-type")) {
          headers.set("content-type", "application/json");
        }
      }
    }

    return executeApiRequest<T>({
      url,
      method,
      requestInit: {
        ...requestInit,
        body: requestBody,
        credentials: credentials ?? "include",
        headers,
      },
    });
  };

  return {
    get: <T>(url: string, config?: ApiRequestConfig) =>
      request<T>("GET", url, undefined, config),
    post: <T>(url: string, body?: ApiRequestBody, config?: ApiRequestConfig) =>
      request<T>("POST", url, body, config),
    put: <T>(url: string, body?: ApiRequestBody, config?: ApiRequestConfig) =>
      request<T>("PUT", url, body, config),
    patch: <T>(url: string, body?: ApiRequestBody, config?: ApiRequestConfig) =>
      request<T>("PATCH", url, body, config),
    delete: <T>(url: string, config?: ApiRequestConfig) =>
      request<T>("DELETE", url, undefined, config),
  };
};

export const isApiError = (error: unknown): error is ApiError<unknown> => {
  return error instanceof ApiError;
};

export const getApiErrorStatus = (error: unknown) => {
  if (isApiError(error)) {
    return error.status;
  }

  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode;
  }

  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return undefined;
};

export const getApiErrorMessage = (error: unknown) => {
  if (isApiError(error)) {
    return getApiMessageFromData(error.data) ?? error.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return undefined;
};

export const getApiClient = (api: ApiName = "default"): ApiClient => {
  const existing = clients.get(api);
  if (existing) {
    return existing;
  }

  const client = createApiClient(api);
  clients.set(api, client);
  return client;
};

export const apiClient = getApiClient("default");

export const battlelogApiClient = getApiClient("battlelog");

export const authApiClient = getApiClient("auth");

export const activityApiClient = getApiClient("activity");
