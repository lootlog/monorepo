import { beforeEach, describe, expect, it, vi } from "vitest";
import { authClient } from "@/lib/auth-client";
import { useAuthRecoveryStore } from "@/store/auth-recovery.store";
import { buildRequestUrl, executeApiRequest } from "./api-client";

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      social: vi.fn(),
    },
  },
}));

const mockFetch = vi.fn<typeof fetch>();

describe("buildRequestUrl", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
    vi.mocked(authClient.signIn.social).mockReset();
    vi.mocked(authClient.signIn.social).mockResolvedValue({} as never);
    useAuthRecoveryStore.getState().clearFailure();
  });

  it("keeps the API base path for paths starting with a slash", () => {
    const url = buildRequestUrl({
      baseURL: "http://localhost/api/lootlog",
      path: "/users/@me/preferences",
    });

    expect(url.toString()).toBe(
      "http://localhost/api/lootlog/users/@me/preferences",
    );
  });

  it("builds the same URL for paths without a leading slash", () => {
    const url = buildRequestUrl({
      baseURL: "http://localhost/api/lootlog",
      path: "users/@me/preferences",
    });

    expect(url.toString()).toBe(
      "http://localhost/api/lootlog/users/@me/preferences",
    );
  });

  it("keeps other service prefixes intact", () => {
    const url = buildRequestUrl({
      baseURL: "http://localhost/api/battlelog",
      path: "/battles",
    });

    expect(url.toString()).toBe("http://localhost/api/battlelog/battles");
  });

  it("serializes params without introducing duplicate slashes", () => {
    const url = buildRequestUrl({
      baseURL: "http://localhost/api/lootlog/",
      path: "/users/@me/preferences",
      params: {
        include: ["theme", "colorMode"],
        page: 2,
        search: null,
      },
    });

    expect(url.toString()).toBe(
      "http://localhost/api/lootlog/users/@me/preferences?include=theme&include=colorMode&page=2",
    );
  });

  it("parses JSON response subtypes", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ detail: "Reauthentication required" }), {
        status: 200,
        headers: {
          "content-type": "application/problem+json",
        },
      }),
    );

    await expect(
      executeApiRequest<{ detail: string }>({
        url: new URL("https://api.example.com/session"),
        method: "GET",
      }),
    ).resolves.toEqual({ detail: "Reauthentication required" });
  });

  it("does not start an OAuth redirect for unauthorized responses", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "TOKEN_REFRESH_FAILED",
          requiresReauth: true,
        }),
        {
          status: 401,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    );

    await expect(
      executeApiRequest({
        url: new URL("https://api.example.com/protected"),
        method: "GET",
      }),
    ).rejects.toMatchObject({ status: 401 });

    expect(authClient.signIn.social).not.toHaveBeenCalled();
    expect(useAuthRecoveryStore.getState().failure).toEqual({
      error: "TOKEN_REFRESH_FAILED",
      requiresReauth: true,
    });
  });
});
