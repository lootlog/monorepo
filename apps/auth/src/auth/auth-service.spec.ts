import { describe, expect, it, mock } from "bun:test";
import { APIError } from "better-auth/api";
import { Effect } from "effect";
import { exportJWK, generateKeyPair, SignJWT, type JSONWebKeySet } from "jose";
import {
  createAuthService,
  HttpResponseError,
  normalizeScopes,
} from "./auth-service.js";
import type { LootlogAuth } from "#src/auth/provider/better-auth";
const findDiscordAccountId = () => Effect.succeed("account-row-1");

const createFakeAuth = () => {
  const getSession = mock(() => Promise.resolve(null));
  const getJwks = mock(() =>
    Promise.resolve({ keys: [] } satisfies JSONWebKeySet),
  );
  const getAccessToken = mock(() => Promise.resolve(null));

  return {
    auth: {
      api: { getSession, getJwks, getAccessToken },
      handler: mock(() => Promise.resolve(new Response())),
    } as unknown as LootlogAuth,
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

  it("prefers a valid session and preserves the internal user id", async () => {
    const { auth, getSession } = createFakeAuth();
    getSession.mockResolvedValue({
      session: {},
      user: { id: "user-1", discordId: "discord-1" },
    } as never);
    const service = createAuthService({
      auth,
      appUrl: "http://localhost:3000",
      findDiscordAccountId,
    });

    await expect(
      Effect.runPromise(
        service.verifyRequestIdentity({ headers: new Headers() }),
      ),
    ).resolves.toEqual({ userId: "user-1", discordId: "discord-1" });
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
    } as never);
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
    ).resolves.toEqual({ userId: "user-2", discordId: "discord-2" });
  });

  it("returns provider token scopes and remaining lifetime", async () => {
    const { auth, getAccessToken } = createFakeAuth();
    getAccessToken.mockResolvedValue({
      accessToken: "token-123",
      accessTokenExpiresAt: new Date(Date.now() + 60_000),
      scopes: "guilds identify",
    } as never);
    const service = createAuthService({
      auth,
      appUrl: "http://localhost:3000",
      findDiscordAccountId,
    });

    const response = await Effect.runPromise(
      service.getIdpTokenResponse({
        userId: "user-1",
        discordId: "discord-1",
      }),
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
    });

    getAccessToken.mockResolvedValue({
      accessToken: "token-123",
      accessTokenExpiresAt: new Date(Date.now() - 1_000),
      scopes: [],
    } as never);
    await expect(
      Effect.runPromise(
        service.getIdpTokenResponse({
          userId: "user-1",
          discordId: "discord-1",
        }),
      ),
    ).rejects.toMatchObject({
      status: 401,
      body: { error: "TOKEN_EXPIRED" },
    });

    getAccessToken.mockResolvedValue({ accessToken: "" } as never);
    await expect(
      Effect.runPromise(
        service.getIdpTokenResponse({
          userId: "user-1",
          discordId: "discord-1",
        }),
      ),
    ).rejects.toMatchObject({
      status: 400,
      body: { error: "TOKEN_NOT_FOUND" },
    });
  });

  it("requires reauthentication when Better Auth cannot refresh the Discord token", async () => {
    const { auth, getAccessToken, getSession } = createFakeAuth();
    getSession.mockResolvedValue({
      session: {},
      user: { id: "user-1", discordId: "discord-1" },
    } as never);
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
