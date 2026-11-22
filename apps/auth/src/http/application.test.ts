import { AdminService, authorizeAdminRequest } from "#src/admin/admin-service";
import { ApiKeyService } from "#src/auth/api-key-service";
import { afterAll, describe, expect, it, mock } from "bun:test";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { Effect, Layer, Redacted } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { AuthService, createAuthService } from "#src/auth/auth-service";
import { BetterAuthRuntime } from "#src/auth/provider/better-auth";
import { resolveBetterAuthBaseURL } from "#src/auth/provider/better-auth-url";
import { normalizeBetterAuthRequest } from "./application.js";
import { AuthRoutes } from "./server.js";
import { OpenApi } from "effect/http-api";
import { AuthApi } from "#src/http-api/auth-api";

const SESSION_TOKEN_COOKIE = "local.session_token";

const SESSION_DATA_COOKIE = "local.session_data";

const makeRuntime = (
  authenticated = true,
  idpTokenSecret: string | null = "idp-test-secret",
  adminApiSecret: string | null = "admin-test-secret",
  adminSession: { userId: string; name: string } | null = {
    userId: "user-1",
    name: "Operator",
  },
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
            user: {
              id: "user-1",
              discordId: "discord-1",
              role: "wiki-moderator,retired-role",
            },
          }
        : null,
    ),
  );

  const getSessionWithCookies = mock(
    async ({ headers }: { headers: Headers }) => ({
      session: await getSession({ headers }),
      setCookie: authenticated
        ? [`${SESSION_DATA_COOKIE}=cached; Path=/; Secure; HttpOnly`]
        : [],
    }),
  );

  const auth = {
    sessionCookieNames: {
      token: SESSION_TOKEN_COOKIE,
      data: SESSION_DATA_COOKIE,
    },
    api: {
      getSession,
      getSessionWithCookies,
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

  const listUsers = mock(() => Effect.succeed({ users: [], total: 0 }));

  const boundary = HttpRouter.toWebHandler(
    AuthRoutes.pipe(
      Layer.provideMerge(Layer.succeed(AuthService, service)),
      Layer.provideMerge(
        Layer.succeed(
          AdminService,
          AdminService.of({
            authorize: (headers) =>
              authorizeAdminRequest(headers, {
                secret:
                  adminApiSecret === null
                    ? undefined
                    : Redacted.make(adminApiSecret),
                adminUserIds: ["user-1"],
                getFreshSession: () => Effect.succeed(adminSession),
              }),
            overview: () => Effect.die("Not configured"),
            listUsers,
            getUser: () => Effect.die("Not configured"),
            setRoles: () => Effect.die("Not configured"),
            ban: () => Effect.die("Not configured"),
            unban: () => Effect.die("Not configured"),
            revokeSessions: () => Effect.die("Not configured"),
            revokeSession: () => Effect.die("Not configured"),
            revokeApiKey: () => Effect.die("Not configured"),
            listRoleHolders: () => Effect.die("Not configured"),
            listAudit: () => Effect.die("Not configured"),
          }),
        ),
      ),
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
    getSessionWithCookies,
    getAccessToken: auth.api.getAccessToken,
    listUsers,
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

  it("blocks the admin plugin endpoints so the admin role cannot impersonate users", async () => {
    const response = await runtime.run(
      new Request("http://localhost/idp/admin/impersonate-user", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "local.session_token=test-session",
        },
        body: JSON.stringify({ userId: "user-2" }),
      }),
    );

    expect(response.status).toBe(404);
  });

  const adminCaller = {
    authorization: "Bearer admin-test-secret",
    cookie: "local.session_token=test-session",
  };

  it.each<Record<string, string>>([
    {},
    { cookie: adminCaller.cookie },
    { ...adminCaller, authorization: "Bearer wrong-secret" },
    { "x-auth-user-id": "user-1", "x-auth-roles": "admin" },
  ])(
    "refuses the admin API without the panel's credential, even to an admin's session: %j",
    async (headers) => {
      const caller = makeRuntime();

      try {
        const response = await caller.run(
          new Request("http://localhost/admin/users", { headers }),
        );

        expect(response.status).toBe(401);
        expect(caller.listUsers).not.toHaveBeenCalled();
      } finally {
        await caller.dispose();
      }
    },
  );

  it("keeps the admin API closed while its secret is not configured", async () => {
    const caller = makeRuntime(true, "idp-test-secret", null);

    try {
      const response = await caller.run(
        new Request("http://localhost/admin/users", {
          headers: { ...adminCaller, authorization: "Bearer " },
        }),
      );

      expect(response.status).toBe(401);
      expect(caller.listUsers).not.toHaveBeenCalled();
    } finally {
      await caller.dispose();
    }
  });

  it.each([
    ["nobody is signed in", null, 401, "ADMIN_SESSION_REQUIRED"],
    [
      "the signed-in user is not an admin account",
      { userId: "user-2", name: "Player" },
      403,
      "ADMIN_ACCESS_REQUIRED",
    ],
  ] as const)(
    "refuses the panel's credential while %s",
    async (_case, session, status, code) => {
      const caller = makeRuntime(true, "idp-test-secret", undefined, session);

      try {
        const response = await caller.run(
          new Request("http://localhost/admin/users", { headers: adminCaller }),
        );

        expect(response.status).toBe(status);
        expect(await response.json()).toMatchObject({ code });
        expect(caller.listUsers).not.toHaveBeenCalled();
      } finally {
        await caller.dispose();
      }
    },
  );

  it("serves the admin API to the panel acting for a signed-in admin account", async () => {
    const caller = makeRuntime();

    try {
      const session = await caller.run(
        new Request("http://localhost/admin/session", { headers: adminCaller }),
      );

      expect(await session.json()).toEqual({
        userId: "user-1",
        name: "Operator",
      });

      const users = await caller.run(
        new Request("http://localhost/admin/users?banned=true&limit=10", {
          headers: adminCaller,
        }),
      );

      expect(users.status).toBe(200);
      expect(users.headers.get("cache-control")).toBe("no-store");
      expect(await users.json()).toEqual({ users: [], total: 0 });
      expect(caller.listUsers).toHaveBeenCalledWith({
        banned: true,
        limit: 10,
      });

      const holders = Array.from(
        { length: 600 },
        (_, index) => `user-${index}`,
      );

      const searched = await caller.run(
        new Request("http://localhost/admin/users/search", {
          method: "POST",
          headers: { ...adminCaller, "content-type": "application/json" },
          body: JSON.stringify({ excludedUserIds: holders, limit: 10 }),
        }),
      );

      expect(searched.status).toBe(200);
      expect(caller.listUsers).toHaveBeenLastCalledWith({
        excludedUserIds: holders,
        limit: 10,
      });
    } finally {
      await caller.dispose();
    }
  });

  it("refuses an operator's ban of their own account", async () => {
    const caller = makeRuntime();

    try {
      const response = await caller.run(
        new Request("http://localhost/admin/users/user-1/ban", {
          method: "PUT",
          headers: { ...adminCaller, "content-type": "application/json" },
          body: JSON.stringify({ reason: "Mistake", expiresAt: null }),
        }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ code: "CANNOT_BAN_SELF" });
    } finally {
      await caller.dispose();
    }
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
    expect(response.headers.get("x-auth-roles")).toBe("wiki-moderator");
    expect(await response.json()).toEqual({ status: "OK" });

    const getSessionHeaders =
      runtime.getSessionWithCookies.mock.calls.at(-1)?.[0]?.headers;

    expect(getSessionHeaders?.get("cookie")).toBe(
      "local.session_token=test-session",
    );
  });

  it("returns the refreshed cookie cache so the next request skips the session store", async () => {
    const response = await runtime.run(
      new Request("http://localhost/auth/verify", {
        headers: { cookie: `${SESSION_TOKEN_COOKIE}=test-session` },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toEqual([
      expect.stringContaining(`${SESSION_DATA_COOKIE}=cached`),
    ]);
  });

  it("does not read the session store without a session token cookie", async () => {
    const fresh = makeRuntime();

    try {
      const response = await fresh.run(
        new Request("http://localhost/auth/verify", {
          headers: { "x-api-key": "unknown" },
        }),
      );

      expect(response.status).toBe(401);
      expect(fresh.getSessionWithCookies).not.toHaveBeenCalled();
    } finally {
      await fresh.dispose();
    }
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
        expect(await response.json()).toEqual({
          code: "AUTHENTICATION_REQUIRED",
        });
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
    expect(await rejected.json()).toMatchObject({ code: "VALIDATION_ERROR" });

    const responses =
      OpenApi.fromApi(AuthApi).paths["/auth/idp-token"]?.post?.responses;

    expect(
      responses?.[rejected.status]?.content?.["application/json"]?.schema,
    ).toBeDefined();
    expect(
      responses?.[401]?.content?.["application/json"]?.schema,
    ).toBeDefined();
  });

  it("asks the Web app to sign in again when the Discord token cannot be refreshed", async () => {
    const caller = makeRuntime();
    caller.getAccessToken.mockRejectedValue(
      new APIError("BAD_REQUEST", { code: "FAILED_TO_GET_ACCESS_TOKEN" }),
    );

    try {
      const response = await caller.run(
        new Request("http://localhost/auth/@me/scopes", {
          headers: { cookie: `${SESSION_TOKEN_COOKIE}=test-session` },
        }),
      );

      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({
        code: "IDP_REAUTH_REQUIRED",
        requiresReauth: true,
      });
    } finally {
      await caller.dispose();
    }
  });
});
