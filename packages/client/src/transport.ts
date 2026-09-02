export type ApiService = "activity" | "auth" | "battlelog" | "main" | "search";

type FetchImplementation = typeof globalThis.fetch;

export type ApiRequestContext = {
  method: string;
  service: ApiService;
  url: string;
};

export type ApiServiceConfig = {
  baseUrl: string;
  credentials?: RequestCredentials;
  fetch?: FetchImplementation;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
  onError?: (error: ApiError<unknown>, context: ApiRequestContext) => void;
};

export type ApiClientOverride = Partial<ApiServiceConfig>;

export type ApiRequestOptions = RequestInit & {
  apiClient?: ApiClientOverride;
};

export type ApiClientRequestOptions = ApiRequestOptions & {
  params?: Record<string, unknown>;
};

type ApiRequestBody = unknown;

export type ApiClient = {
  get<T>(path: string, options?: ApiClientRequestOptions): Promise<T>;
  post<T>(
    path: string,
    body?: ApiRequestBody,
    options?: ApiClientRequestOptions,
  ): Promise<T>;
  put<T>(
    path: string,
    body?: ApiRequestBody,
    options?: ApiClientRequestOptions,
  ): Promise<T>;
  patch<T>(
    path: string,
    body?: ApiRequestBody,
    options?: ApiClientRequestOptions,
  ): Promise<T>;
  delete<T>(path: string, options?: ApiClientRequestOptions): Promise<T>;
};

export class ApiError<TData = unknown> extends Error {
  public readonly cause: unknown;
  public readonly status?: number;
  public readonly data: TData | undefined;
  public readonly url: string;
  public readonly method: string;

  public constructor({
    cause,
    data,
    message,
    method,
    status,
    url,
  }: {
    cause?: unknown;
    data?: TData;
    message: string;
    method: string;
    status?: number;
    url: string;
  }) {
    super(message);
    this.cause = cause;
    this.name = "ApiError";
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
    for (const [service, configuration] of Object.entries(
      registration.configurations,
    )) {
      if (configuration) {
        serviceConfigurations.set(service as ApiService, configuration);
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

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
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

const encodeQueryComponent = (value: string) => {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
};

const appendQueryValue = (
  entries: string[],
  key: string,
  value: unknown,
  ancestors: Set<object>,
): void => {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      appendQueryValue(entries, key, item, ancestors);
    }
    return;
  }

  if (value instanceof Date) {
    entries.push(
      `${encodeQueryComponent(key)}=${encodeQueryComponent(value.toISOString())}`,
    );
    return;
  }

  if (isObject(value)) {
    if (ancestors.has(value)) {
      throw new RangeError("Cannot serialize circular query parameters");
    }

    ancestors.add(value);
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      appendQueryValue(entries, `${key}[${nestedKey}]`, nestedValue, ancestors);
    }
    ancestors.delete(value);
    return;
  }

  entries.push(
    `${encodeQueryComponent(key)}=${encodeQueryComponent(String(value))}`,
  );
};

const serializeQueryParams = (params: Record<string, unknown>) => {
  const entries: string[] = [];
  const ancestors = new Set<object>();

  for (const [key, value] of Object.entries(params)) {
    appendQueryValue(entries, key, value, ancestors);
  }

  return entries.join("&");
};

const isAbsoluteUrl = (value: string) => {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(value);
};

const buildRequestUrl = ({
  baseUrl,
  params,
  path,
}: {
  baseUrl: string;
  params?: Record<string, unknown>;
  path: string;
}) => {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.replace(/^\/+/, "");
  const url = isAbsoluteUrl(path)
    ? new URL(path)
    : new URL(normalizedPath, normalizedBaseUrl);
  const query = params ? serializeQueryParams(params) : "";

  if (query) {
    url.search = query;
  }

  return url;
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
    return JSON.parse(responseText) as unknown;
  } catch {
    return responseText;
  }
};

const isBinaryBody = (body: unknown): body is BodyInit => {
  return (
    typeof body === "string" ||
    (typeof Blob !== "undefined" && body instanceof Blob) ||
    (typeof FormData !== "undefined" && body instanceof FormData) ||
    (typeof URLSearchParams !== "undefined" &&
      body instanceof URLSearchParams) ||
    (typeof ArrayBuffer !== "undefined" && body instanceof ArrayBuffer) ||
    (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(body))
  );
};

const createRequestBody = (
  body: ApiRequestBody,
  headers: Headers,
): BodyInit | undefined => {
  if (body === undefined) {
    return undefined;
  }

  if (isBinaryBody(body)) {
    return body;
  }

  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  return JSON.stringify(body);
};

const resolveBaseUrl = (
  service: ApiService,
  override: ApiClientOverride | undefined,
  serviceConfiguration: ApiClientOverride | undefined,
  path: string,
) => {
  const baseUrl =
    override?.baseUrl ??
    serviceConfiguration?.baseUrl ??
    (isAbsoluteUrl(path) ? new URL(path).origin : undefined);

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
  path: string,
) => {
  const serviceConfiguration = serviceConfigurations.get(service);
  const baseUrl = resolveBaseUrl(service, override, serviceConfiguration, path);
  const fetchImplementation = resolveFetchImplementation(
    service,
    override,
    serviceConfiguration,
  );

  return {
    baseUrl,
    credentials: override?.credentials ?? serviceConfiguration?.credentials,
    fetch: fetchImplementation,
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
  } catch {
    // Error observers must not replace the request error.
  }
};

const executeFetch = async ({
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

    const fetchImplementation = configuration.fetch;
    if (fetchImplementation) {
      return await fetchImplementation.call(globalThis, url, requestOptions);
    }

    return await fetch(url, requestOptions);
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

export const executeApiRequest = async <TData>(
  service: ApiService,
  path: string,
  options: ApiRequestOptions = {},
): Promise<TData> => {
  const { apiClient, headers: requestHeaders, ...requestInit } = options;
  const configuration = resolveRequestConfiguration(service, apiClient, path);
  const url = buildRequestUrl({
    baseUrl: configuration.baseUrl,
    path,
  });
  const headers = new Headers(await configuration.getHeaders?.());

  new Headers(requestHeaders).forEach((value, key) => {
    headers.set(key, value);
  });

  const method = requestInit.method ?? "GET";
  const response = await executeFetch({
    configuration,
    headers,
    method,
    requestInit,
    service,
    url,
  });
  const data = await parseResponse(response);

  if (!response.ok) {
    const error = new ApiError({
      data,
      message:
        getApiMessageFromData(data) || response.statusText || "Request failed",
      method,
      status: response.status,
      url: url.toString(),
    });

    notifyError(configuration.onError, error, service);
    throw error;
  }

  return data as TData;
};

const requestWithBody = <TData>(
  service: ApiService,
  method: string,
  path: string,
  body: ApiRequestBody,
  options: ApiClientRequestOptions = {},
) => {
  try {
    const { params, ...requestOptions } = options;
    const configuration = resolveRequestConfiguration(
      service,
      requestOptions.apiClient,
      path,
    );
    const url = buildRequestUrl({
      baseUrl: configuration.baseUrl,
      params,
      path,
    });
    const headers = new Headers(requestOptions.headers);
    const requestBody = createRequestBody(body, headers);

    return executeApiRequest<TData>(service, url.toString(), {
      ...requestOptions,
      body: requestBody,
      headers,
      method,
    });
  } catch (error) {
    return Promise.reject(error);
  }
};

export const createApiClient = (
  service: ApiService,
  overrides?: ApiClientOverride,
): ApiClient => {
  const withOverrides = (
    options: ApiClientRequestOptions = {},
  ): ApiClientRequestOptions => ({
    ...options,
    apiClient: {
      ...overrides,
      ...options.apiClient,
    },
  });

  return {
    get: <TData>(path: string, options?: ApiClientRequestOptions) =>
      requestWithBody<TData>(
        service,
        "GET",
        path,
        undefined,
        withOverrides(options),
      ),
    post: <TData>(
      path: string,
      body?: ApiRequestBody,
      options?: ApiClientRequestOptions,
    ) =>
      requestWithBody<TData>(
        service,
        "POST",
        path,
        body,
        withOverrides(options),
      ),
    put: <TData>(
      path: string,
      body?: ApiRequestBody,
      options?: ApiClientRequestOptions,
    ) =>
      requestWithBody<TData>(
        service,
        "PUT",
        path,
        body,
        withOverrides(options),
      ),
    patch: <TData>(
      path: string,
      body?: ApiRequestBody,
      options?: ApiClientRequestOptions,
    ) =>
      requestWithBody<TData>(
        service,
        "PATCH",
        path,
        body,
        withOverrides(options),
      ),
    delete: <TData>(path: string, options?: ApiClientRequestOptions) =>
      requestWithBody<TData>(
        service,
        "DELETE",
        path,
        undefined,
        withOverrides(options),
      ),
  };
};

export const isApiError = (error: unknown): error is ApiError<unknown> => {
  return error instanceof ApiError;
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

export const getApiErrorMessage = (error: unknown) => {
  if (isApiError(error)) {
    return getApiMessageFromData(error.data) ?? error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return undefined;
};
