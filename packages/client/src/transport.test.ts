import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type ApiRequestContext,
  ApiError,
  configureApiClients,
  createApiClient,
  executeApiRequest,
  getApiErrorMessage,
  getApiErrorStatus,
  isApiError,
} from "./transport";

describe("API client transport", () => {
  let restoreConfiguration: (() => void) | undefined;

  afterEach(() => {
    restoreConfiguration?.();
    restoreConfiguration = undefined;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses configured service defaults and lets request options override them", async () => {
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { "content-type": "application/json" },
        status: 200,
      }),
    );
    restoreConfiguration = configureApiClients({
      main: {
        baseUrl: "https://api.example.test/root/",
        credentials: "include",
        fetch: fetchImplementation,
        getHeaders: () => ({
          "x-default": "default",
          "x-overridden": "default",
        }),
      },
    });

    const client = createApiClient("main");
    const response = await client.get<{ ok: boolean }>("/users", {
      credentials: "omit",
      headers: {
        "x-overridden": "request",
        "x-request": "request",
      },
      params: {
        guildId: ["one", "two"],
        nested: { enabled: true },
        skipped: undefined,
      },
    });

    expect(response).toEqual({ ok: true });
    expect(fetchImplementation).toHaveBeenCalledOnce();

    const [requestUrl, requestInit] = fetchImplementation.mock.calls[0] ?? [];
    expect(String(requestUrl)).toBe(
      "https://api.example.test/root/users?guildId=one&guildId=two&nested%5Benabled%5D=true",
    );
    expect(requestInit?.credentials).toBe("omit");

    const headers = new Headers(requestInit?.headers);
    expect(headers.get("x-default")).toBe("default");
    expect(headers.get("x-overridden")).toBe("request");
    expect(headers.get("x-request")).toBe("request");
  });

  it("preserves the receiver for a service-configured fetch", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(function (
      this: typeof globalThis | undefined,
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) {
      if (this !== globalThis) {
        throw new TypeError("Illegal invocation");
      }
      return Promise.resolve(Response.json({ ok: true }));
    });
    restoreConfiguration = configureApiClients({
      main: {
        baseUrl: "https://api.example.test",
        fetch: fetchImplementation,
      },
    });

    await expect(createApiClient("main").get("/status")).resolves.toEqual({
      ok: true,
    });
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });

  it("supports isolated per-request configuration without global state", async () => {
    const firstFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ source: "first" }));
    const secondFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ source: "second" }));

    const [firstResponse, secondResponse] = await Promise.all([
      executeApiRequest<{ source: string }>("search", "/items", {
        apiClient: {
          baseUrl: "https://first.example.test",
          fetch: firstFetch,
        },
      }),
      executeApiRequest<{ source: string }>("search", "/items", {
        apiClient: {
          baseUrl: "https://second.example.test",
          fetch: secondFetch,
        },
      }),
    ]);

    expect(firstResponse.source).toBe("first");
    expect(secondResponse.source).toBe("second");
    expect(String(firstFetch.mock.calls[0]?.[0])).toBe(
      "https://first.example.test/items",
    );
    expect(String(secondFetch.mock.calls[0]?.[0])).toBe(
      "https://second.example.test/items",
    );
  });

  it("preserves the receiver for a per-request fetch override", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(function (
      this: typeof globalThis | undefined,
      _input: RequestInfo | URL,
      _init?: RequestInit,
    ) {
      if (this !== globalThis) {
        throw new TypeError("Illegal invocation");
      }
      return Promise.resolve(Response.json({ ok: true }));
    });

    await expect(
      createApiClient("search").get("/items", {
        apiClient: {
          baseUrl: "https://search.example.test",
          fetch: fetchImplementation,
        },
      }),
    ).resolves.toEqual({ ok: true });
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });

  it("restores nested configurations safely when disposed out of order", async () => {
    const firstFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ source: "first" }));
    const secondFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ source: "second" }));
    const restoreFirst = configureApiClients({
      main: {
        baseUrl: "https://first.example.test",
        fetch: firstFetch,
      },
    });
    const restoreSecond = configureApiClients({
      main: {
        baseUrl: "https://second.example.test",
        fetch: secondFetch,
      },
    });

    restoreFirst();
    await expect(createApiClient("main").get("/status")).resolves.toEqual({
      source: "second",
    });

    restoreSecond();
    await expect(createApiClient("main").get("/status")).rejects.toThrow(
      "Missing base URL for main API request",
    );
  });

  it("normalizes failed responses and notifies the configured error handler", async () => {
    const onError =
      vi.fn<(error: ApiError<unknown>, context: ApiRequestContext) => void>();
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ message: ["Session expired"] }), {
        headers: { "content-type": "application/json" },
        status: 401,
      }),
    );
    restoreConfiguration = configureApiClients({
      auth: {
        baseUrl: "https://auth.example.test",
        fetch: fetchImplementation,
        onError,
      },
    });

    const request = createApiClient("auth").get("/session");

    await expect(request).rejects.toMatchObject({
      data: { message: ["Session expired"] },
      message: "Session expired",
      method: "GET",
      status: 401,
      url: "https://auth.example.test/session",
    });

    expect(onError).toHaveBeenCalledOnce();
    const error = onError.mock.calls[0]?.[0];
    expect(isApiError(error)).toBe(true);
    expect(getApiErrorStatus(error)).toBe(401);
    expect(getApiErrorMessage(error)).toBe("Session expired");
  });

  it("preserves the network failure as the cause of ApiError", async () => {
    const networkError = new TypeError("Connection refused");
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockRejectedValue(networkError);

    const request = executeApiRequest("main", "/healthz", {
      apiClient: {
        baseUrl: "https://api.example.test",
        fetch: fetchImplementation,
      },
    });

    await expect(request).rejects.toEqual(
      expect.objectContaining({
        cause: networkError,
        message: "Connection refused",
        method: "GET",
        url: "https://api.example.test/healthz",
      }),
    );
  });

  it("serializes JSON request bodies without replacing caller headers", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ id: "created" }));
    const client = createApiClient("main", {
      baseUrl: "https://api.example.test",
      fetch: fetchImplementation,
    });

    await expect(
      client.post(
        "/users",
        { name: "Alice" },
        { headers: { "x-request-id": "request-id" } },
      ),
    ).resolves.toEqual({ id: "created" });

    const requestInit = fetchImplementation.mock.calls[0]?.[1];
    expect(requestInit?.body).toBe(JSON.stringify({ name: "Alice" }));

    const headers = new Headers(requestInit?.headers);
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-request-id")).toBe("request-id");
  });

  it("returns text and empty responses without forcing JSON parsing", async () => {
    const fetchImplementation = vi.fn<typeof fetch>();
    fetchImplementation
      .mockResolvedValueOnce(
        new Response("ready", {
          headers: { "content-type": "text/plain" },
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const requestOptions = {
      apiClient: {
        baseUrl: "https://api.example.test",
        fetch: fetchImplementation,
      },
    };

    await expect(
      executeApiRequest<string>("main", "/status", requestOptions),
    ).resolves.toBe("ready");
    await expect(
      executeApiRequest<void>("main", "/empty", requestOptions),
    ).resolves.toBeUndefined();
  });

  it("requires a base URL when neither defaults nor an override provide one", async () => {
    await expect(executeApiRequest("main", "/users")).rejects.toThrow(
      "Missing base URL for main API request",
    );
  });

  it("uses an absolute request URL without service configuration", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchImplementation);

    await expect(
      createApiClient("main").get("https://public.example.test/characters"),
    ).resolves.toEqual({ ok: true });
    expect(String(fetchImplementation.mock.calls[0]?.[0])).toBe(
      "https://public.example.test/characters",
    );
  });

  it("uses the global fetch fallback", async () => {
    const fetchImplementation = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal("fetch", fetchImplementation);
    restoreConfiguration = configureApiClients({
      main: {
        baseUrl: "https://api.example.test",
      },
    });

    await expect(createApiClient("main").get("/status")).resolves.toEqual({
      ok: true,
    });
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });

  it("reports when fetch is unavailable in the current runtime", async () => {
    vi.stubGlobal("fetch", undefined);

    await expect(
      executeApiRequest("main", "/users", {
        apiClient: { baseUrl: "https://api.example.test" },
      }),
    ).rejects.toThrow("Fetch is unavailable for main API request");
  });

  it("exposes stable helpers for API and router-like errors", () => {
    const error = new ApiError({
      data: { message: "Invalid request" },
      message: "Invalid request",
      method: "POST",
      status: 400,
      url: "https://api.example.test/users",
    });

    expect(isApiError(error)).toBe(true);
    expect(getApiErrorStatus(error)).toBe(400);
    expect(getApiErrorMessage(error)).toBe("Invalid request");
    expect(getApiErrorStatus({ statusCode: 409 })).toBe(409);
    expect(getApiErrorMessage(new Error("Fallback"))).toBe("Fallback");
  });
});
