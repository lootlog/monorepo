import { describe, expect, it, vi } from "vitest";
import { API_URL, AUTH_API_URL, BATTLELOG_API_URL } from "@/config/api";
import { executeExtensionHttp, MAX_EXTENSION_HTTP_BYTES } from "./http";

const signal = () => new AbortController().signal;
const request = (url = `${API_URL}/timers`, method = "GET") => ({
  url,
  method,
  headers: { accept: "application/json" },
});

describe("extension HTTP boundary", () => {
  it.each([
    [`${API_URL}/timers?world=jaruna`, "GET"],
    [`${API_URL}/loots`, "POST"],
    [`${API_URL}/loots/123`, "PATCH"],
    [`${API_URL}/guilds/123/timers/npc%20name/reset`, "PATCH"],
    [`${API_URL}/messaging/party-gathering/abc/applications/me`, "DELETE"],
    [`${BATTLELOG_API_URL}/battles`, "POST"],
  ])(
    "forwards supported game operation %s %s with credentials and no redirects",
    async (url, method) => {
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('{"ok":true}'));
      const abortSignal = signal();
      const result = await executeExtensionHttp(
        request(url, method),
        abortSignal,
        fetcher,
      );
      expect(result.body).toBe('{"ok":true}');
      expect(fetcher).toHaveBeenCalledWith(
        url,
        expect.objectContaining({
          method,
          credentials: "include",
          redirect: "error",
          signal: abortSignal,
        }),
      );
    },
  );

  it.each([
    ["https://example.com/timers", "GET"],
    [`${API_URL}.evil/timers`, "GET"],
    [`${API_URL}/users/@me`, "DELETE"],
    [`${AUTH_API_URL}/idp/get-access-token`, "POST"],
    [`${AUTH_API_URL}/auth/realtime-ticket`, "POST"],
    [`${AUTH_API_URL}/idp/get-session`, "POST"],
    [`${API_URL}/guilds/a%2fb/members`, "GET"],
    [`${API_URL}/timers#fragment`, "GET"],
    [`${API_URL}/timers`, "POST"],
  ])(
    "rejects unsupported operation %s %s before making a request",
    async (url, method) => {
      const fetcher = vi.fn<typeof fetch>();
      await expect(
        executeExtensionHttp(request(url, method), signal(), fetcher),
      ).rejects.toThrow();
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it.each(["authorization", "cookie", "x-forwarded-host"])(
    "rejects caller-supplied %s",
    async (name) => {
      const fetcher = vi.fn<typeof fetch>();
      await expect(
        executeExtensionHttp(
          { ...request(), headers: { [name]: "secret" } },
          signal(),
          fetcher,
        ),
      ).rejects.toThrow("header");
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("never returns session tokens or credential response headers to MAIN", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          user: { id: "user" },
          session: { id: "session", token: "secret", expiresAt: "tomorrow" },
        },
        {
          headers: {
            "set-cookie": "session=secret",
            "set-auth-token": "secret",
          },
        },
      ),
    );
    const result = await executeExtensionHttp(
      request(`${AUTH_API_URL}/idp/get-session`),
      signal(),
      fetcher,
    );
    expect(JSON.parse(result.body)).toEqual({
      user: { id: "user" },
      session: { id: "session", expiresAt: "tomorrow" },
    });
    expect(JSON.stringify(result)).not.toContain("secret");
  });

  it("preserves HTTP failure status, body and retry timing", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("rate limited", {
        status: 429,
        headers: { "retry-after": "10" },
      }),
    );
    expect(
      await executeExtensionHttp(request(), signal(), fetcher),
    ).toMatchObject({
      status: 429,
      body: "rate limited",
      headers: { "retry-after": "10" },
    });
  });

  it("rejects oversized UTF-8 request bodies before fetch", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      executeExtensionHttp(
        {
          ...request(`${BATTLELOG_API_URL}/battles`, "POST"),
          body: "ą".repeat(MAX_EXTENSION_HTTP_BYTES / 2 + 1),
        },
        signal(),
        fetcher,
      ),
    ).rejects.toThrow("too large");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("bounds streamed responses even without content-length", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_EXTENSION_HTTP_BYTES + 1));
      },
      cancel,
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body));
    await expect(
      executeExtensionHttp(request(), signal(), fetcher),
    ).rejects.toThrow("too large");
    expect(cancel).toHaveBeenCalled();
  });

  it("does not fetch after cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      executeExtensionHttp(request(), controller.signal, fetcher),
    ).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
});
