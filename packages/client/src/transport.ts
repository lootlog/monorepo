import { Predicate } from "effect";
import { isObjectRecord as isObject } from "@lootlog/schema/records";
import {
  API_SERVICE_NAMES,
  type ApiService,
} from "@lootlog/schema/api-services";

type FetchImplementation = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type ApiRequestContext = {
  method: string;
  service: ApiService;
  url: string;
};

export type ApiServiceConfig = {
  baseUrl: string;
  credentials?: RequestCredentials;
  fetch?: FetchImplementation;
  timeoutMs?: number;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
  onError?: (error: ApiError<unknown>, context: ApiRequestContext) => void;
};

export type ApiClientOverride = Partial<ApiServiceConfig>;

export type ApiRequestOptions = RequestInit & {
  apiClient?: ApiClientOverride;
};

export class ApiError<TData = unknown> extends Error {
  public readonly cause: unknown;
  public readonly status?: number;
  public readonly data: TData | undefined;
  public readonly retryAt?: number;
  public readonly url: string;
  public readonly method: string;

  public constructor({
    cause,
    data,
    message,
    method,
    retryAt,
    status,
    url,
  }: {
    cause?: unknown;
    data?: TData;
    message: string;
    method: string;
    retryAt?: number;
    status?: number;
    url: string;
  }) {
    super(message);
    this.cause = cause;
    this.name = "ApiError";
    this.retryAt = retryAt;
    this.status = status;
    this.data = data;
    this.url = url;
    this.method = method;
  }
}

const serviceConfigurations = new Map<ApiService, ApiServiceConfig>();

const configurationRegistrations: Array<{
  configurations: Partial<Record<ApiService, ApiServiceConfig>>;
}> = [];

const rebuildServiceConfigurations = (): void => {
  serviceConfigurations.clear();

  for (const registration of configurationRegistrations) {
    for (const service of API_SERVICE_NAMES) {
      const configuration = registration.configurations[service];

      if (configuration) {
        serviceConfigurations.set(service, configuration);
      }
    }
  }
};

export const configureApiClients = (
  configurations: Partial<Record<ApiService, ApiServiceConfig>>,
) => {
  const registration = { configurations };
  configurationRegistrations.push(registration);
  rebuildServiceConfigurations();

  let restored = false;

  return () => {
    if (restored) {
      return;
    }

    restored = true;
    const registrationIndex = configurationRegistrations.indexOf(registration);

    if (registrationIndex !== -1) {
      configurationRegistrations.splice(registrationIndex, 1);
      rebuildServiceConfigurations();
    }
  };
};

const getApiMessageFromData = (data: unknown): string | undefined => {
  if (typeof data === "string") {
    return data.trim() || undefined;
  }

  if (!isObject(data)) {
    return undefined;
  }

  const rawMessage = data.message;
  const message = Array.isArray(rawMessage) ? rawMessage[0] : rawMessage;

  return typeof message === "string" ? message.trim() || undefined : undefined;
};

const buildRequestUrl = (baseUrl: string, path: string) => {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.replace(/^\/+/, "");

  return new URL(normalizedPath, normalizedBaseUrl);
};

const isJsonContentType = (contentType: string | null) => {
  return Boolean(
    contentType?.includes("application/json") || contentType?.includes("+json"),
  );
};

const parseResponse = async (response: Response) => {
  const responseText = await response.text();

  if (!responseText) {
    return undefined;
  }

  if (!isJsonContentType(response.headers.get("content-type"))) {
    return responseText;
  }

  try {
    const parsed: unknown = JSON.parse(responseText);

    return parsed;
  } catch {
    return responseText;
  }
};

const resolveBaseUrl = (
  service: ApiService,
  override: ApiClientOverride | undefined,
  serviceConfiguration: ApiClientOverride | undefined,
) => {
  const baseUrl = override?.baseUrl ?? serviceConfiguration?.baseUrl;

  if (!baseUrl) {
    throw new Error(`Missing base URL for ${service} API request`);
  }

  return baseUrl;
};

const resolveFetchImplementation = (
  service: ApiService,
  override: ApiClientOverride | undefined,
  serviceConfiguration: ApiClientOverride | undefined,
) => {
  const fetchImplementation = override?.fetch ?? serviceConfiguration?.fetch;

  if (!fetchImplementation && typeof fetch === "undefined") {
    throw new Error(`Fetch is unavailable for ${service} API request`);
  }

  return fetchImplementation;
};

const resolveRequestConfiguration = (
  service: ApiService,
  override: ApiClientOverride | undefined,
) => {
  const serviceConfiguration = serviceConfigurations.get(service);
  const baseUrl = resolveBaseUrl(service, override, serviceConfiguration);

  const fetchImplementation = resolveFetchImplementation(
    service,
    override,
    serviceConfiguration,
  );

  return {
    baseUrl,
    credentials: override?.credentials ?? serviceConfiguration?.credentials,
    fetch: fetchImplementation,
    timeoutMs: override?.timeoutMs ?? serviceConfiguration?.timeoutMs,
    getHeaders: override?.getHeaders ?? serviceConfiguration?.getHeaders,
    onError: override?.onError ?? serviceConfiguration?.onError,
  };
};

const notifyError = (
  onError: ApiServiceConfig["onError"],
  error: ApiError<unknown>,
  service: ApiService,
) => {
  try {
    onError?.(error, {
      method: error.method,
      service,
      url: error.url,
    });
  } catch {}
};

const withRequestTimeout = async <T>(
  execute: (signal: AbortSignal) => Promise<T>,
  callerSignal: AbortSignal | null | undefined,
  timeoutMs: number,
): Promise<T> => {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let cancel: (() => void) | undefined;

  const interrupted = new Promise<never>((_resolve, reject) => {
    cancel = () => {
      controller.abort(callerSignal?.reason);
      reject(controller.signal.reason);
    };

    if (callerSignal?.aborted) {
      cancel();

      return;
    }

    callerSignal?.addEventListener("abort", cancel, { once: true });
    timeout = setTimeout(() => {
      controller.abort(
        new DOMException("API request timed out", "TimeoutError"),
      );
      reject(controller.signal.reason);
    }, timeoutMs);
  });

  try {
    if (controller.signal.aborted) return await interrupted;

    return await Promise.race([execute(controller.signal), interrupted]);
  } finally {
    clearTimeout(timeout);

    if (cancel) callerSignal?.removeEventListener("abort", cancel);
  }
};

const executeRequest = async ({
  configuration,
  headers,
  method,
  requestInit,
  service,
  url,
}: {
  configuration: ReturnType<typeof resolveRequestConfiguration>;
  headers: Headers;
  method: string;
  requestInit: RequestInit;
  service: ApiService;
  url: URL;
}) => {
  try {
    const requestOptions = {
      ...requestInit,
      credentials: requestInit.credentials ?? configuration.credentials,
      headers,
    };

    const fetchAndRead = async (signal: AbortSignal | null | undefined) => {
      const fetchImplementation = configuration.fetch;
      const options = { ...requestOptions, signal };

      const response = fetchImplementation
        ? await fetchImplementation.call(globalThis, url, options)
        : await fetch(url, options);

      return { response, data: await parseResponse(response) };
    };

    if (configuration.timeoutMs !== undefined)
      return await withRequestTimeout(
        fetchAndRead,
        requestInit.signal,
        configuration.timeoutMs,
      );

    return await fetchAndRead(requestInit.signal);
  } catch (caughtError) {
    const error = new ApiError({
      cause: caughtError,
      message:
        caughtError instanceof Error
          ? caughtError.message
          : "Network request failed",
      method,
      url: url.toString(),
    });

    notifyError(configuration.onError, error, service);
    throw error;
  }
};

const IMF_FIXDATE =
  /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/;

const parseRetryAt = (value: string | null, now: number) => {
  const trimmed = value?.trim() ?? "";

  let retryAt = Number.NaN;

  if (/^\d+$/.test(trimmed)) retryAt = now + Number(trimmed) * 1000;
  else if (IMF_FIXDATE.test(trimmed)) retryAt = Date.parse(trimmed);

  return Number.isNaN(new Date(retryAt).getTime()) ? undefined : retryAt;
};

export const executeApiRequest = async <TData>(
  service: ApiService,
  path: string,
  options: ApiRequestOptions = {},
): Promise<TData> => {
  const { apiClient, headers: requestHeaders, ...requestInit } = options;
  const configuration = resolveRequestConfiguration(service, apiClient);
  const url = buildRequestUrl(configuration.baseUrl, path);

  const headers = new Headers(await configuration.getHeaders?.());

  new Headers(requestHeaders).forEach((value, key) => {
    headers.set(key, value);
  });

  const method = requestInit.method ?? "GET";

  const { response, data } = await executeRequest({
    configuration,
    headers,
    method,
    requestInit,
    service,
    url,
  });

  if (!response.ok) {
    const error = new ApiError({
      data,
      message:
        getApiMessageFromData(data) || response.statusText || "Request failed",
      method,
      retryAt: parseRetryAt(response.headers.get("retry-after"), Date.now()),
      status: response.status,
      url: url.toString(),
    });

    notifyError(configuration.onError, error, service);
    throw error;
  }

  // SAFETY: generated callers supply TData from the matching OpenAPI response contract.
  // This transport decodes content types; endpoint-specific validation belongs to the service contract.
  return data as TData;
};

export const isApiError = (error: unknown): error is ApiError<unknown> => {
  return error instanceof ApiError;
};

export const getApiErrorStringField = (
  cause: unknown,
  field: "message" | "code",
): string | undefined => {
  if (!isApiError(cause) || !isObject(cause.data)) return undefined;
  const value = cause.data[field];

  return typeof value === "string" ? value : undefined;
};

const getApiErrorDetail = (cause: unknown, key: string) => {
  if (!isApiError(cause) || !isObject(cause.data)) return undefined;
  const details = cause.data.details;

  return isObject(details) ? details[key] : undefined;
};

export const getApiErrorStringDetail = (
  cause: unknown,
  key: string,
): string | undefined => {
  const value = getApiErrorDetail(cause, key);

  return Predicate.isString(value) ? value : undefined;
};

export const getApiErrorNumberDetail = (
  cause: unknown,
  key: string,
): number | undefined => {
  const value = getApiErrorDetail(cause, key);

  return Predicate.isNumber(value) && Number.isFinite(value)
    ? value
    : undefined;
};

export const getApiErrorStatus = (error: unknown) => {
  if (isApiError(error)) {
    return error.status;
  }

  if (isObject(error) && typeof error.statusCode === "number") {
    return error.statusCode;
  }

  if (isObject(error) && typeof error.status === "number") {
    return error.status;
  }

  return undefined;
};

const MAX_QUERY_RETRIES = 2;

const REQUEST_TIMEOUT_STATUS = 408;

const TOO_MANY_REQUESTS_STATUS = 429;

export const isRetryableApiFailure = (cause: unknown): boolean => {
  const status = getApiErrorStatus(cause);

  return !(
    status !== undefined &&
    status >= 400 &&
    status < 500 &&
    status !== REQUEST_TIMEOUT_STATUS &&
    status !== TOO_MANY_REQUESTS_STATUS
  );
};

export const shouldRetryQuery = (failureCount: number, error: Error) =>
  isRetryableApiFailure(error) && failureCount < MAX_QUERY_RETRIES;

export const getApiErrorMessage = (error: unknown) => {
  if (isApiError(error)) {
    return getApiMessageFromData(error.data) ?? error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return undefined;
};
