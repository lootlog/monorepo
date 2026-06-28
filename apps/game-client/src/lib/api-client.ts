import { API_URL, AUTH_API_URL, BATTLELOG_API_URL } from "@/config/api";
import { applyDevPermissionOverrideHeader } from "@/lib/dev-permission-override";
import { stringify } from "qs";

type ApiType = "default" | "battlelog" | "auth" | "public";

type ApiErrorLike = {
  message?: string | string[];
};

type ApiRequestBody = unknown;

export type ApiRequestConfig = Omit<RequestInit, "body" | "method"> & {
  params?: Record<string, unknown>;
  withCredentials?: boolean;
};

export type ApiClientResponse<T> = {
  data: T;
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
  get<T>(url: string, config?: ApiRequestConfig): Promise<ApiClientResponse<T>>;
  post<T>(
    url: string,
    body?: ApiRequestBody,
    config?: ApiRequestConfig,
  ): Promise<ApiClientResponse<T>>;
  put<T>(
    url: string,
    body?: ApiRequestBody,
    config?: ApiRequestConfig,
  ): Promise<ApiClientResponse<T>>;
  patch<T>(
    url: string,
    body?: ApiRequestBody,
    config?: ApiRequestConfig,
  ): Promise<ApiClientResponse<T>>;
  delete<T>(
    url: string,
    config?: ApiRequestConfig,
  ): Promise<ApiClientResponse<T>>;
};

const API_URL_MAP: Record<ApiType, string | undefined> = {
  default: API_URL,
  battlelog: BATTLELOG_API_URL,
  auth: AUTH_API_URL,
  public: API_URL,
};

const WITH_CREDENTIALS_BY_API: Record<ApiType, boolean> = {
  default: true,
  battlelog: true,
  auth: true,
  public: false,
};

const clients = new Map<ApiType, ApiClient>();

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

const isAbsoluteUrl = (value: string) => {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(value);
};

const normalizeBaseUrl = (baseURL: string) => {
  return baseURL.endsWith("/") ? baseURL : `${baseURL}/`;
};

const normalizeRequestPath = (path: string) => {
  return path.replace(/^\/+/, "");
};

const getApiMessageFromData = (data: unknown): string | undefined => {
  if (typeof data === "string") {
    return data.trim().length > 0 ? data : undefined;
  }

  if (!isApiErrorData(data)) {
    return undefined;
  }

  const normalizedMessage = Array.isArray(data.message)
    ? data.message[0]
    : data.message;

  if (typeof normalizedMessage !== "string") {
    return undefined;
  }

  return normalizedMessage.trim().length > 0 ? normalizedMessage : undefined;
};

const isJsonContentType = (contentType: string | null) => {
  if (!contentType) {
    return false;
  }

  return (
    contentType.includes("application/json") || contentType.includes("+json")
  );
};

const parseResponseBody = (
  responseText: string,
  contentType: string | null,
) => {
  if (responseText.length === 0) {
    return undefined;
  }

  if (!isJsonContentType(contentType)) {
    return responseText;
  }

  try {
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
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

const createRequestInit = (
  method: string,
  body: ApiRequestBody | undefined,
  config: ApiRequestConfig | undefined,
  withCredentials: boolean,
) => {
  const {
    params: _params,
    withCredentials: configuredWithCredentials,
    headers: headerInit,
    credentials,
    ...requestInit
  } = config ?? {};
  const headers = new Headers(headerInit);
  applyDevPermissionOverrideHeader(headers);

  let requestBody: BodyInit | undefined;

  if (body !== undefined) {
    if (isBinaryBody(body)) {
      requestBody = body;
    } else {
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      requestBody = JSON.stringify(body);
    }
  }

  return {
    ...requestInit,
    body: requestBody,
    credentials:
      credentials ??
      ((configuredWithCredentials ?? withCredentials) ? "include" : "omit"),
    headers,
    method,
  } satisfies RequestInit;
};

const createApiClient = (
  baseURL: string | undefined,
  withCredentials: boolean,
): ApiClient => {
  const request = async <T>(
    method: string,
    path: string,
    body?: ApiRequestBody,
    config?: ApiRequestConfig,
  ): Promise<ApiClientResponse<T>> => {
    if (!baseURL && !isAbsoluteUrl(path)) {
      throw new Error(`Missing base URL for request path: ${path}`);
    }

    const url = buildRequestUrl({
      baseURL: baseURL ?? window.location.origin,
      path,
      params: config?.params,
    });
    const data = await executeApiRequest<T>({
      url,
      method,
      requestInit: createRequestInit(method, body, config, withCredentials),
    });

    return { data };
  };

  return {
    get: (path, config) => request("GET", path, undefined, config),
    post: (path, body, config) => request("POST", path, body, config),
    put: (path, body, config) => request("PUT", path, body, config),
    patch: (path, body, config) => request("PATCH", path, body, config),
    delete: (path, config) => request("DELETE", path, undefined, config),
  };
};

export function getApiClient(api: ApiType = "default"): ApiClient {
  const existing = clients.get(api);

  if (existing) {
    return existing;
  }

  const client = createApiClient(
    API_URL_MAP[api],
    WITH_CREDENTIALS_BY_API[api],
  );
  clients.set(api, client);

  return client;
}

export const isApiError = (error: unknown): error is ApiError<unknown> => {
  return error instanceof ApiError;
};
