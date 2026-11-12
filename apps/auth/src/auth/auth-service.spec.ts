import { describe, expect, it, mock } from "bun:test";
import { APIError } from "better-auth/api";
import { Effect, Redacted } from "effect";
import { TestClock } from "effect/testing";
import { exportJWK, generateKeyPair, SignJWT, type JSONWebKeySet } from "jose";
import {
  createAuthService,
  HttpResponseError,
  SESSION_DECISION_TTL_MS,
  normalizeScopes,
  type AuthProvider,
} from "./auth-service.js";

const findDiscordAccountId = () => Effect.succeed("account-row-1");

const SESSION_COOKIE = "test.session_token";

const withSessionCookie = () =>
  new Headers({ cookie: `${SESSION_COOKIE}=signed-value` });

const createFakeAuth = () => {
  const getSession = mock<AuthProvider["api"]["getSession"]>(() =>
    Promise.resolve(null),
  );

  const getJwks = mock<AuthProvider["api"]["getJwks"]>(() =>
    Promise.resolve({ keys: [] } satisfies JSONWebKeySet),
  );

  const getAccessToken = mock<AuthProvider["api"]["getAccessToken"]>(() =>
    Promise.resolve(null),
  );

  return {
    auth: {
      sessionCookieNames: { token: SESSION_COOKIE, data: "session_data" },
      api: {
        getSession,
        getSessionWithCookies: async ({ headers }) => ({
          session: await getSession({ headers }),
          setCookie: [],
        }),
        getJwks,
        getAccessToken,
      },
    } satisfies AuthProvider,
    getAccessToken,
    getJwks,
    getSession,
  };
};

describe("AuthService", () => {
  it("normalizes Discord scopes without accepting non-string values", () => {
    expect(normalizeScopes(["guilds", 123, "email"])).toEqual([
      "guilds",
      "email",
    ]);
    expect(normalizeScopes("guilds identify")).toEqual(["guilds", "identify"]);
    expect(normalizeScopes(null)).toEqual([]);
  });

  it("rejects spoofed forward-auth identity headers", async () => {
    const { auth } = createFakeAuth();

    const service = createAuthService({
      auth,
      appUrl: "http://localhost:3000",
      findDiscordAccountId,
    });

    await expect(
      Effect.runPromise(
        service.verifyRequestIdentity({
          headers: new Headers(),
          authDiscordId: "spoofed",
        }),
      ),
    ).rejects.toBeInstanceOf(HttpResponseError);
  });

  it("never falls back to a session when an explicit API key is rejected", async () => {
    const { auth, getSession } = createFakeAuth();
    getSession.mockResolvedValue({
      user: { id: "user", discordId: "discord" },
    });

    const service = createAuthService({
      auth,
      appUrl: "https://auth.test",
      findDiscordAccountId,
      verifyApiKey: () =>
        Effect.fail(
          new HttpResponseError({ status: 401, body: { message: "Rejected" } }),
        ),
    });

    await expect(
      Effect.runPromise(
        service.verifyRequestIdentity({
          headers: new Headers({
            "x-api-key": "invalid",
            cookie: "session=valid",
          }),
        }),
      ),
    ).rejects.toMatchObject({ status: 401 });
    expect(getSession).not.toHaveBeenCalled();
  });

  it("returns key grants only from the key verifier", async () => {
    const { auth, getSession } = createFakeAuth();

    const identity = {
      userId: "user",
      discordId: "discord",
      apiKeyAccess: {
        keyId: "key",
        organizationIds: ["123"],
        mode: "read" as const,
        personalData: false,
        expiresAt: null,
      },
    };

    const service = createAuthService({
      auth,
      appUrl: "https://auth.test",
      findDiscordAccountId,
      verifyApiKey: () => Effect.succeed(identity),
    });

    expect(
      await Effect.runPromise(
        service.verifyRequestIdentity({
          headers: new Headers({ "x-api-key": "valid" }),
        }),
      ),
    ).toMatchObject({ identity });
    expect(getSession).not.toHaveBeenCalled();
  });

  it("prefers a valid session and preserves the internal user id", async () => {
    const { auth, getSession } = createFakeAuth();
    getSession.mockResolvedValue({
      user: { id: "user-1", discordId: "discord-1" },
    });

    const service = createAuthService({
      auth,
      appUrl: "http://localhost:3000",
      findDiscordAccountId,
    });

    await expect(
      Effect.runPromise(
        service.verifyRequestIdentity({ headers: withSessionCookie() }),
      ),
    ).resolves.toMatchObject({
      identity: { userId: "user-1", discordId: "discord-1" },
    });
  });

  describe("session decision cache", () => {
    const setup = () => {
      const { auth, getSession } = createFakeAuth();

      getSession.mockResolvedValue({
        user: { id: "user-1", discordId: "discord-1" },
      });

      const service = createAuthService({
        auth,
        appUrl: "http://localhost:3000",
        findDiscordAccountId,
      });

      return { getSession, service };
    };

    it("reuses a session decision only until it expires", async () => {
      const { getSession, service } = setup();

      await Effect.runPromise(
        Effect.gen(function* () {
          yield* service.verifyRequestIdentity({
            headers: withSessionCookie(),
          });
          yield* service.verifyRequestIdentity({
            headers: withSessionCookie(),
          });
          expect(getSession).toHaveBeenCalledTimes(1);

          yield* TestClock.adjust(SESSION_DECISION_TTL_MS + 1);
          yield* service.verifyRequestIdentity({
            headers: withSessionCookie(),
          });
          expect(getSession).toHaveBeenCalledTimes(2);
        }).pipe(Effect.provide(TestClock.layer())),
      );
    });

    it("never lets one session cookie answer for another", async () => {
      const { getSession, service } = setup();
      getSession.mockResolvedValueOnce(null);

      await expect(
        Effect.runPromise(
          service.verifyRequestIdentity({
            headers: new Headers({ cookie: `${SESSION_COOKIE}=revoked` }),
          }),
        ),
      ).rejects.toBeInstanceOf(HttpResponseError);

      await expect(
        Effect.runPromise(
          service.verifyRequestIdentity({
            headers: new Headers({ cookie: `${SESSION_COOKIE}=other` }),
          }),
        ),
      ).resolves.toMatchObject({ identity: { userId: "user-1" } });

      expect(getSession).toHaveBeenCalledTimes(2);
    });

    it("does not remember a refusal", async () => {
      const { getSession, service } = setup();
      getSession.mockResolvedValueOnce(null);

      await expect(
        Effect.runPromise(
          service.verifyRequestIdentity({ headers: withSessionCookie() }),
        ),
      ).rejects.toBeInstanceOf(HttpResponseError);

      await expect(
        Effect.runPromise(
          service.verifyRequestIdentity({ headers: withSessionCookie() }),
        ),
      ).resolves.toMatchObject({ identity: { userId: "user-1" } });
    });
  });

  it("verifies bearer JWTs against Better Auth JWKS", async () => {
    const issuer = "https://auth.example.test";
    const { privateKey, publicKey } = await generateKeyPair("EdDSA");
    const publicJwk = await exportJWK(publicKey);

    const token = await new SignJWT({ discordId: "discord-2" })
      .setProtectedHeader({ alg: "EdDSA", kid: "test-key" })
      .setSubject("user-2")
      .setIssuer(issuer)
      .setAudience(issuer)
      .setExpirationTime("5m")
      .sign(privateKey);

    const { auth, getJwks } = createFakeAuth();
    getJwks.mockResolvedValue({
      keys: [{ ...publicJwk, alg: "EdDSA", kid: "test-key" }],
    });

    const service = createAuthService({
      auth,
      appUrl: issuer,
      findDiscordAccountId,
    });

    await expect(
      Effect.runPromise(
        service.verifyRequestIdentity({
          headers: new Headers(),
          authorizationHeader: `Bearer ${token}`,
        }),
      ),
    ).resolves.toMatchObject({
      identity: { userId: "user-2", discordId: "discord-2" },
    });
  });

  it("returns provider token scopes and remaining lifetime", async () => {
    const { auth, getAccessToken } = createFakeAuth();
    getAccessToken.mockResolvedValue({
      accessToken: "token-123",
      accessTokenExpiresAt: new Date(Date.now() + 60_000),
      scopes: "guilds identify",
    });

    const service = createAuthService({
      auth,
      appUrl: "http://localhost:3000",
      findDiscordAccountId,
      idpTokenSecret: Redacted.make("idp-test-secret"),
    });

    const response = await Effect.runPromise(
      service.getIdpTokenResponse(
        {
          userId: "user-1",
          discordId: "discord-1",
        },
        "Bearer idp-test-secret",
      ),
    );

    expect(response.accessToken).toBe("token-123");
    expect(response.scopes).toEqual(["guilds", "identify"]);
    expect(response.expiresIn).toBeGreaterThanOrEqual(59);
    expect(getAccessToken).toHaveBeenCalledWith({
      body: {
        userId: "user-1",
        accountId: "account-row-1",
      },
    });
  });

  it("keeps TOKEN_EXPIRED and TOKEN_NOT_FOUND response contracts", async () => {
    const { auth, getAccessToken } = createFakeAuth();

    const service = createAuthService({
      auth,
      appUrl: "http://localhost:3000",
      findDiscordAccountId,
      idpTokenSecret: Redacted.make("idp-test-secret"),
    });

    getAccessToken.mockResolvedValue({
      accessToken: "token-123",
      accessTokenExpiresAt: new Date(Date.now() - 1_000),
      scopes: [],
    });
    await expect(
      Effect.runPromise(
        service.getIdpTokenResponse(
          {
            userId: "user-1",
            discordId: "discord-1",
          },
          "Bearer idp-test-secret",
        ),
      ),
    ).rejects.toMatchObject({
      status: 401,
      body: { error: "TOKEN_EXPIRED" },
    });

    getAccessToken.mockResolvedValue({ accessToken: "" });
    await expect(
      Effect.runPromise(
        service.getIdpTokenResponse(
          {
            userId: "user-1",
            discordId: "discord-1",
          },
          "Bearer idp-test-secret",
        ),
      ),
    ).rejects.toMatchObject({
      status: 400,
      body: { error: "TOKEN_NOT_FOUND" },
    });
  });

  it("requires reauthentication when Better Auth cannot refresh the Discord token", async () => {
    const { auth, getAccessToken, getSession } = createFakeAuth();
    getSession.mockResolvedValue({
      user: { id: "user-1", discordId: "discord-1" },
    });
    getAccessToken.mockRejectedValue(
      new APIError("BAD_REQUEST", {
        code: "FAILED_TO_GET_ACCESS_TOKEN",
        message: "Failed to get a valid access token",
      }),
    );

    const service = createAuthService({
      auth,
      appUrl: "http://localhost:3000",
      findDiscordAccountId,
    });

    await expect(
      Effect.runPromise(service.getCurrentUserScopes(new Headers())),
    ).rejects.toMatchObject({
      status: 401,
      body: { error: "IDP_REAUTH_REQUIRED", requiresReauth: true },
    });
  });
});
