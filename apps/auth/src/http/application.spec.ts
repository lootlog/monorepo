import { ApiKeyService } from "#src/auth/api-key-service";
import { afterAll, describe, expect, it, mock } from "bun:test";
import { betterAuth } from "better-auth";
import { Effect, Layer, Redacted } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { AuthService, createAuthService } from "#src/auth/auth-service";
import { BetterAuthRuntime } from "#src/auth/provider/better-auth";
import { resolveBetterAuthBaseURL } from "#src/auth/provider/better-auth-url";
import { normalizeBetterAuthRequest } from "./application.js";
import { AuthRoutes } from "./server.js";
import { OpenApi } from "effect/unstable/httpapi";
import { AuthApi } from "#src/http-api/auth-api";

const makeRuntime = (
  authenticated = true,
  idpTokenSecret: string | null = "idp-test-secret",
) => {
  const betterAuthHandler = mock((request: Request) =>
    Promise.resolve(
      new Response(request.url, {
        status: 201,
        headers: { "set-cookie": "session=test; Secure" },
      }),
    ),
  );
  const getSession = mock((_context: { headers: Headers }) =>
    Promise.resolve(
      authenticated
        ? {
            session: {},
            user: { id: "user-1", discordId: "discord-1" },
          }
        : null,
    ),
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
  } satisfies typeof BetterAuthRuntime.Service;
  const service = createAuthService({
    auth,
    appUrl: "http://localhost:3000",
    idpTokenSecret:
      idpTokenSecret === null ? undefined : Redacted.make(idpTokenSecret),
    findDiscordAccountId: () => Effect.succeed("account-row-1"),
  });
  const boundary = HttpRouter.toWebHandler(
    AuthRoutes.pipe(
      Layer.provideMerge(Layer.succeed(AuthService, service)),
      Layer.provideMerge(
        Layer.succeed(
          ApiKeyService,
          ApiKeyService.of({
            session: () => Effect.succeed("user-1"),
            list: () => Effect.die("Not configured"),
            create: () => Effect.die("Not configured"),
            rename: () => Effect.die("Not configured"),
            remove: () => Effect.die("Not configured"),
            verify: () => Effect.die("Not configured"),
            statuses: () => Effect.die("Not configured"),
          }),
        ),
      ),
      Layer.provideMerge(Layer.succeed(BetterAuthRuntime, auth)),
      Layer.provide(HttpServer.layerServices),
    ),
    { disableLogger: true },
  );
  const run = boundary.handler;

  return {
    betterAuthHandler,
    dispose: boundary.dispose,
    getSession,
    getAccessToken: auth.api.getAccessToken,
    run,
  };
};

const runtime = makeRuntime();
afterAll(() => runtime.dispose());

describe("Auth HttpApi contract", () => {
  const unauthorizedHeaders: Record<string, string>[] = [
    {},
    { authorization: "Bearer wrong-secret" },
    { cookie: "session=valid" },
    { "x-auth-user-id": "user-1", "x-auth-discord-id": "discord-1" },
  ];
  it.each(unauthorizedHeaders)(
    "rejects non-service callers before retrieving provider credentials: %j",
    async (headers) => {
      const caller = makeRuntime();
      try {
        const response = await caller.run(
          new Request("http://localhost/auth/idp-token", {
            method: "POST",
            headers: { "content-type": "application/json", ...headers },
            body: JSON.stringify({
              userId: "victim",
              discordId: "victim-discord",
            }),
          }),
        );
        expect(response.status).toBe(401);
        expect(caller.getAccessToken).not.toHaveBeenCalled();
      } finally {
        await caller.dispose();
      }
    },
  );

  it.each([null, ""])(
    "fails closed when the IDP service secret is missing or empty: %s",
    async (secret) => {
      const caller = makeRuntime(true, secret);
      try {
        const response = await caller.run(
          new Request("http://localhost/auth/idp-token", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: "Bearer ",
            },
            body: JSON.stringify({
              userId: "victim",
              discordId: "victim-discord",
            }),
          }),
        );
        expect(response.status).toBe(401);
        expect(caller.getAccessToken).not.toHaveBeenCalled();
      } finally {
        await caller.dispose();
      }
    },
  );
  it("builds the public Better Auth base URL from the service root", () => {
    expect(resolveBetterAuthBaseURL("https://auth.lootlog.pl")).toBe(
      "https://auth.lootlog.pl/idp",
    );
    expect(resolveBetterAuthBaseURL("http://localhost/api/auth/")).toBe(
      "http://localhost/api/auth/idp",
    );
  });

  it.each([86400, 86400 * 60, 86400 * 366])(
    "rejects unsupported key expiration %s before creation",
    async (expiresIn) => {
      const response = await runtime.run(
        new Request("http://localhost/auth/api-keys", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "Invalid expiry",
            organizationIds: ["123"],
            mode: "read",
            personalData: false,
            expiresIn,
          }),
        }),
      );
      expect(response.status).toBe(400);
    },
  );

  it("blocks the raw plugin endpoints so API key policies cannot be bypassed", async () => {
    const response = await runtime.run(
      new Request("http://localhost/idp/api-key/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Bypass",
          metadata: { organizationIds: ["other"] },
        }),
      }),
    );
    expect(response.status).toBe(404);
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
    const getSessionHeaders =
      runtime.getSession.mock.calls.at(-1)?.[0]?.headers;
    expect(getSessionHeaders?.get("cookie")).toBe(
      "local.session_token=test-session",
    );
  });

  it("no longer exposes the realtime ticket endpoint", async () => {
    const response = await runtime.run(
      new Request("http://localhost/auth/realtime-ticket", { method: "POST" }),
    );
    expect(response.status).toBe(404);
  });

  it.each([undefined, "invalid.session_token=expired"])(
    "rejects missing or invalid sessions without identity headers: %s",
    async (cookie) => {
      const anonymous = makeRuntime(false);
      try {
        const response = await anonymous.run(
          new Request("http://localhost/auth/verify", {
            headers: cookie ? { cookie } : {},
          }),
        );
        expect(response.status).toBe(401);
        expect(response.headers.get("x-auth-user-id")).toBeNull();
        expect(response.headers.get("x-auth-discord-id")).toBeNull();
      } finally {
        await anonymous.dispose();
      }
    },
  );

  it.each(["x-auth-user-id", "x-auth-discord-id"])(
    "rejects client-supplied identity even with a valid session: %s",
    async (header) => {
      const response = await runtime.run(
        new Request("http://localhost/auth/verify", {
          headers: { [header]: "spoofed", cookie: "session=valid" },
        }),
      );
      expect(response.status).toBe(401);
      expect(response.headers.get("x-auth-user-id")).toBeNull();
      expect(response.headers.get("x-auth-discord-id")).toBeNull();
    },
  );

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
        headers: {
          "content-type": "application/json",
          authorization: "Bearer idp-test-secret",
        },
        body: JSON.stringify({ userId: " user-1 ", discordId: " discord-1 " }),
      }),
    );
    expect(accepted.status).toBe(200);
    expect(accepted.headers.get("cache-control")).toBe("no-store");
    expect(await accepted.json()).toMatchObject({
      accessToken: "provider-token",
      scopes: ["identify"],
    });

    const rejected = await runtime.run(
      new Request("http://localhost/auth/idp-token", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer idp-test-secret",
        },
        body: JSON.stringify({
          userId: "user-1",
          discordId: "discord-1",
          role: "admin",
        }),
      }),
    );
    expect(rejected.status).toBe(400);
    const responses =
      OpenApi.fromApi(AuthApi).paths["/auth/idp-token"]?.post?.responses;
    expect(
      responses?.[rejected.status]?.content?.["application/json"]?.schema,
    ).toBeDefined();
    expect(
      responses?.[401]?.content?.["application/json"]?.schema,
    ).toBeDefined();
  });
});
