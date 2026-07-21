import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  buildRequestUrl,
  executeApiRequest,
  getApiClient,
  isApiError,
} from "./api-client";

const mockFetch = vi.fn<typeof fetch>();

describe("api-client", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("builds request URLs with repeated array params and skips nullish values", () => {
    const url = buildRequestUrl({
      baseURL: "https://api.example.com",
      path: "/timers",
      params: {
        world: "pandora",
        guildIds: ["guild-1", "guild-2"],
        ignored: null,
        alsoIgnored: undefined,
      },
    });

    expect(url.toString()).toBe(
      "https://api.example.com/timers?world=pandora&guildIds=guild-1&guildIds=guild-2",
    );
  });

  it("keeps absolute request paths untouched", () => {
    const url = buildRequestUrl({
      baseURL: "https://api.example.com",
      path: "https://external.example.com/health",
      params: {
        verbose: true,
      },
    });

    expect(url.toString()).toBe(
      "https://external.example.com/health?verbose=true",
    );
  });

  it("serializes nested values, dates, and reserved characters like qs", () => {
    const url = buildRequestUrl({
      baseURL: "https://api.example.com",
      path: "/search",
      params: {
        filter: {
          createdAt: new Date("2026-07-20T10:00:00.000Z"),
          names: ["A B", "C&D"],
          omitted: null,
        },
      },
    });

    expect(url.toString()).toBe(
      "https://api.example.com/search?filter%5BcreatedAt%5D=2026-07-20T10%3A00%3A00.000Z&filter%5Bnames%5D=A%20B&filter%5Bnames%5D=C%26D",
    );
  });

  it("parses successful JSON responses", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    await expect(
      executeApiRequest<{ ok: boolean }>({
        url: new URL("https://api.example.com/health"),
        method: "GET",
      }),
    ).resolves.toEqual({ ok: true });
  });

  it("parses JSON response subtypes", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "Validation failed" }), {
        status: 200,
        headers: {
          "content-type": "application/problem+json",
        },
      }),
    );

    await expect(
      executeApiRequest<{ detail: string }>({
        url: new URL("https://api.example.com/fail"),
        method: "GET",
      }),
    ).resolves.toEqual({ detail: "Validation failed" });
  });

  it("returns raw text for non-json responses", async () => {
    mockFetch.mockResolvedValue(
      new Response("plain-text-response", {
        status: 200,
        headers: {
          "content-type": "text/plain",
        },
      }),
    );

    await expect(
      executeApiRequest<string>({
        url: new URL("https://api.example.com/health"),
        method: "GET",
      }),
    ).resolves.toBe("plain-text-response");
  });

  it("maps HTTP failures to ApiError using the API message", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ message: ["Request failed badly"] }), {
        status: 400,
        statusText: "Bad Request",
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    try {
      await executeApiRequest({
        url: new URL("https://api.example.com/fail"),
        method: "PATCH",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(isApiError(error)).toBe(true);
      expect(error).toMatchObject({
        status: 400,
        method: "PATCH",
        message: "Request failed badly",
      });
      return;
    }

    throw new Error("Expected executeApiRequest to throw");
  });

  it("maps network failures to ApiError", async () => {
    mockFetch.mockRejectedValue(new Error("socket hang up"));

    try {
      await executeApiRequest({
        url: new URL("https://api.example.com/fail"),
        method: "POST",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(isApiError(error)).toBe(true);
      expect(error).toMatchObject({
        status: undefined,
        method: "POST",
        message: "socket hang up",
      });
      return;
    }

    throw new Error("Expected executeApiRequest to throw");
  });

  it("serializes json bodies and includes credentials for the default client", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: 15 }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const client = getApiClient("default");
    const response = await client.post<{ id: number }>("/timers", {
      guildId: "guild-1",
    });

    expect(response.data).toEqual({ id: 15 });
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [requestUrl, requestInit] = mockFetch.mock.calls[0] as [
      URL,
      RequestInit,
    ];

    expect(requestUrl.toString()).toBe("http://localhost/api/lootlog/timers");
    expect(requestInit.method).toBe("POST");
    expect(requestInit.credentials).toBe("include");
    expect(requestInit.body).toBe(JSON.stringify({ guildId: "guild-1" }));
    expect(new Headers(requestInit.headers).get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("keeps binary bodies intact and omits credentials for the public client", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const formData = new FormData();
    formData.set("file", new Blob(["payload"]), "payload.txt");

    const client = getApiClient("public");
    await client.post<{ ok: boolean }>("/upload", formData);

    const [requestUrl, requestInit] = mockFetch.mock.calls[0] as [
      URL,
      RequestInit,
    ];

    expect(requestUrl.toString()).toBe("http://localhost/api/lootlog/upload");
    expect(requestInit.credentials).toBe("omit");
    expect(requestInit.body).toBe(formData);
    expect(new Headers(requestInit.headers).has("Content-Type")).toBe(false);
  });

  it("strips client-only config fields from request init", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "content-type": "application/json",
        },
      }),
    );

    const client = getApiClient("default");
    await client.get<{ ok: boolean }>("/timers", {
      params: {
        world: "pandora",
      },
      withCredentials: false,
    });

    const [requestUrl, requestInit] = mockFetch.mock.calls[0] as [
      URL,
      RequestInit,
    ];

    expect(requestUrl.toString()).toBe(
      "http://localhost/api/lootlog/timers?world=pandora",
    );
    expect("params" in requestInit).toBe(false);
    expect("withCredentials" in requestInit).toBe(false);
    expect(requestInit.credentials).toBe("omit");
  });

  it("caches clients per api type", () => {
    expect(getApiClient("default")).toBe(getApiClient("default"));
    expect(getApiClient("default")).not.toBe(getApiClient("public"));
  });
});
