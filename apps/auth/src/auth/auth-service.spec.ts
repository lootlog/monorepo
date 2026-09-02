import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import { exportJWK, generateKeyPair, SignJWT, type JSONWebKeySet } from "jose";
import {
  createAuthService,
  HttpResponseError,
  normalizeScopes,
} from "./auth-service.js";
import type { LootlogAuth } from "./better-auth.js";
import { issueRealtimeTicket } from "./realtime-ticket.js";

const realtimeTicketRedis = {
  set: () => Promise.resolve("OK"),
  getdel: () => Promise.resolve(null),
};

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
      realtimeTicketRedis,
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
      realtimeTicketRedis,
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
      realtimeTicketRedis,
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

  it("consumes websocket tickets once and never falls back to ordinary bearer verification", async () => {
    const values = new Map<string, string>();
    const ticketRedis = {
      set: (key: string, value: string) => {
        values.set(key, value);
        return Promise.resolve("OK");
      },
      getdel: (key: string) => {
        const value = values.get(key) ?? null;
        values.delete(key);
        return Promise.resolve(value);
      },
    };
    const { auth, getJwks } = createFakeAuth();
    const { ticket } = await issueRealtimeTicket(
      ticketRedis,
      { userId: "user-1", discordId: "discord-1" },
      "https://classic.margonem.pl",
    );
    const service = createAuthService({
      auth,
      appUrl: "http://localhost:3000",
      realtimeTicketRedis: ticketRedis,
    });
    const request = {
      headers: new Headers(),
      authorizationHeader: `Bearer ${ticket}`,
      credentialPurpose: "websocket-ticket",
      websocketOrigin: "https://classic.margonem.pl",
    } as const;
    await expect(
      Effect.runPromise(service.verifyRequestIdentity(request)),
    ).resolves.toEqual({ userId: "user-1", discordId: "discord-1" });
    await expect(
      Effect.runPromise(service.verifyRequestIdentity(request)),
    ).rejects.toMatchObject({ status: 401 });
    expect(getJwks).not.toHaveBeenCalled();
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
      realtimeTicketRedis,
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
        providerId: "discord",
        userId: "user-1",
        accountId: "discord-1",
      },
    });
  });

  it("keeps TOKEN_EXPIRED and TOKEN_NOT_FOUND response contracts", async () => {
    const { auth, getAccessToken } = createFakeAuth();
    const service = createAuthService({
      auth,
      appUrl: "http://localhost:3000",
      realtimeTicketRedis,
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
});
