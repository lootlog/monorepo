import { afterAll, describe, expect, it, mock } from "bun:test";
import { betterAuth } from "better-auth";
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { AuthService, createAuthService } from "#src/auth/auth-service";
import { BetterAuthRuntime, type LootlogAuth } from "#src/auth/better-auth";
import { resolveBetterAuthBaseURL } from "#src/auth/better-auth-url";
import { normalizeBetterAuthRequest } from "./application.js";
import { AuthRoutes } from "./server.js";

const makeRuntime = () => {
  const ticketValues = new Map<string, string>();
  const realtimeTicketRedis = {
    set: (key: string, value: string) => {
      ticketValues.set(key, value);
      return Promise.resolve("OK");
    },
    getdel: (key: string) => {
      const value = ticketValues.get(key) ?? null;
      ticketValues.delete(key);
      return Promise.resolve(value);
    },
  };
  const betterAuthHandler = mock((request: Request) =>
    Promise.resolve(
      new Response(request.url, {
        status: 201,
        headers: { "set-cookie": "session=test; Secure" },
      }),
    ),
  );
  const getSession = mock((_context: { headers: Headers }) =>
    Promise.resolve({
      session: {},
      user: { id: "user-1", discordId: "discord-1" },
    }),
  );
  const auth = {
    api: {
      getSession,
      getJwks: mock(() => Promise.resolve({ keys: [] })),
      getAccessToken: mock(() =>
        Promise.resolve({
          accessToken: "provider-token",
          accessTokenExpiresAt: new Date(Date.now() + 60_000),
          scopes: ["identify"],
        }),
      ),
    },
    handler: betterAuthHandler,
    options: { baseURL: "http://localhost/api/auth/idp" },
  } as unknown as LootlogAuth;
  const service = createAuthService({
    auth,
    appUrl: "http://localhost:3000",
    findDiscordAccountId: () => Effect.succeed("account-row-1"),
    realtimeTicketRedis,
  });
  const boundary = HttpRouter.toWebHandler(
    AuthRoutes.pipe(
      Layer.provide(Layer.succeed(AuthService, service)),
      Layer.provide(Layer.succeed(BetterAuthRuntime, auth)),
      Layer.provide(HttpServer.layerServices),
    ),
    { disableLogger: true },
  );
  const run = boundary.handler as (request: Request) => Promise<Response>;

  return {
    betterAuthHandler,
    dispose: boundary.dispose,
    getSession,
    run,
    ticketValues,
  };
};

const runtime = makeRuntime();
afterAll(() => runtime.dispose());

describe("Auth HttpApi contract", () => {
  it("builds the public Better Auth base URL from the service root", () => {
    expect(resolveBetterAuthBaseURL("https://auth.lootlog.pl")).toBe(
      "https://auth.lootlog.pl/idp",
    );
    expect(resolveBetterAuthBaseURL("http://localhost/api/auth/")).toBe(
      "http://localhost/api/auth/idp",
    );
  });

  it("serves the existing health status", async () => {
    const response = await runtime.run(new Request("http://localhost/healthz"));
    expect(response.status).toBe(200);
  });

  it("sets both forward-auth identity response headers", async () => {
    const response = await runtime.run(
      new Request("http://localhost/auth/verify", {
        headers: { cookie: "local.session_token=test-session" },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-auth-user-id")).toBe("user-1");
    expect(response.headers.get("x-auth-discord-id")).toBe("discord-1");
    expect(await response.json()).toEqual({ status: "OK" });
    const getSessionHeaders = runtime.getSession.mock.calls.at(-1)?.[0]
      ?.headers as Headers | undefined;
    expect(getSessionHeaders?.get("cookie")).toBe(
      "local.session_token=test-session",
    );
  });

  it("issues an origin-bound no-store realtime ticket", async () => {
    const response = await runtime.run(
      new Request("http://localhost/auth/realtime-ticket", {
        method: "POST",
        headers: { origin: "https://classic.margonem.pl" },
      }),
    );
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({
      ticket: expect.any(String),
      expiresAt: expect.any(Number),
    });
    expect([...runtime.ticketValues.keys()][0]).toMatch(
      /^auth:realtime-ticket:[a-f0-9]{64}$/,
    );
  });

  it("delegates /idp and /idp/* as raw Web requests", async () => {
    const request = new Request(
      "http://auth:4001/idp/callback/discord?code=test&state=state",
      { headers: { cookie: "oauth_state=test" } },
    );
    const response = await runtime.run(request);

    expect(response.status).toBe(201);
    expect(response.headers.get("set-cookie")).toBe("session=test; Secure");
    expect(runtime.betterAuthHandler).toHaveBeenCalledTimes(1);
    expect(runtime.betterAuthHandler.mock.calls[0]?.[0].url).toBe(
      "http://localhost/api/auth/idp/callback/discord?code=test&state=state",
    );
  });

  it("uses the canonical Better Auth origin behind a reverse proxy", () => {
    const request = new Request(
      "http://auth:4001/idp/callback/discord?code=test",
      { headers: { "x-forwarded-proto": "https, http" } },
    );
    expect(
      normalizeBetterAuthRequest(request, "https://auth.example.test/idp").url,
    ).toBe("https://auth.example.test/idp/callback/discord?code=test");
  });

  it("preserves Better Auth request bodies while normalizing the origin", async () => {
    const request = new Request("http://auth:4001/idp/sign-in/social", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-proto": "https",
      },
      body: JSON.stringify({ provider: "discord", disableRedirect: true }),
    });
    const normalized = normalizeBetterAuthRequest(
      request,
      "https://auth.example.test/idp",
    );

    expect(normalized.url).toBe("https://auth.example.test/idp/sign-in/social");
    expect(await normalized.json()).toEqual({
      provider: "discord",
      disableRedirect: true,
    });
  });

  it("restores the public Better Auth path removed by the reverse proxy", async () => {
    const betterAuthBaseURL = resolveBetterAuthBaseURL(
      "http://localhost/api/auth",
    );
    const auth = betterAuth({
      baseURL: betterAuthBaseURL,
      secret: "auth-route-test-secret-with-at-least-32-characters",
    });
    const request = normalizeBetterAuthRequest(
      new Request("http://auth:4001/idp/get-session"),
      betterAuthBaseURL,
    );

    const response = await auth.handler(request);

    expect(request.url).toBe("http://localhost/api/auth/idp/get-session");
    expect(response.status).toBe(200);
    expect(await response.json()).toBeNull();
  });

  it("strictly validates and trims idp-token payloads", async () => {
    const accepted = await runtime.run(
      new Request("http://localhost/auth/idp-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: " user-1 ", discordId: " discord-1 " }),
      }),
    );
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({
      accessToken: "provider-token",
      scopes: ["identify"],
    });

    const rejected = await runtime.run(
      new Request("http://localhost/auth/idp-token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          userId: "user-1",
          discordId: "discord-1",
          role: "admin",
        }),
      }),
    );
    expect(rejected.status).toBe(400);
  });
});
