import { describe, expect, it, mock } from "bun:test";
import { Effect } from "effect";
import { AuthService, createAuthService } from "#src/auth/auth-service";
import { BetterAuthRuntime, type LootlogAuth } from "#src/auth/better-auth";
import {
  handleAuthRequest,
  normalizeBetterAuthRequest,
} from "./application.js";

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
  const handler = mock((request: Request) =>
    Promise.resolve(
      new Response(request.url, {
        status: 201,
        headers: { "set-cookie": "session=test; Secure" },
      }),
    ),
  );
  const auth = {
    api: {
      getSession: mock(() =>
        Promise.resolve({
          session: {},
          user: { id: "user-1", discordId: "discord-1" },
        }),
      ),
      getJwks: mock(() => Promise.resolve({ keys: [] })),
      getAccessToken: mock(() =>
        Promise.resolve({
          accessToken: "provider-token",
          accessTokenExpiresAt: new Date(Date.now() + 60_000),
          scopes: ["identify"],
        }),
      ),
    },
    handler,
  } as unknown as LootlogAuth;
  const service = createAuthService({
    auth,
    appUrl: "http://localhost:3000",
    realtimeTicketRedis,
  });
  const run = (request: Request) =>
    Effect.runPromise(
      handleAuthRequest(request).pipe(
        Effect.provideService(AuthService, service),
        Effect.provideService(BetterAuthRuntime, auth),
      ),
    );

  return { handler, run, ticketValues };
};

describe("Auth HTTP contract", () => {
  it("serves the existing health response", async () => {
    const { run } = makeRuntime();
    const response = await run(new Request("http://localhost/healthz"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("sets both forward-auth identity response headers", async () => {
    const { run } = makeRuntime();
    const response = await run(new Request("http://localhost/auth/verify"));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-auth-user-id")).toBe("user-1");
    expect(response.headers.get("x-auth-discord-id")).toBe("discord-1");
    expect(await response.json()).toEqual({ status: "OK" });
  });

  it("issues an origin-bound no-store realtime ticket", async () => {
    const { run, ticketValues } = makeRuntime();
    const response = await run(
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
    expect([...ticketValues.keys()][0]).toMatch(
      /^auth:realtime-ticket:[a-f0-9]{64}$/,
    );
  });

  it("delegates /idp and /idp/* as raw Web requests", async () => {
    const { handler, run } = makeRuntime();
    const request = new Request(
      "https://auth.example.test/idp/callback/discord?code=test&state=state",
      { headers: { cookie: "oauth_state=test" } },
    );
    const response = await run(request);

    expect(handler).toHaveBeenCalledWith(request);
    expect(response.status).toBe(201);
    expect(response.headers.get("set-cookie")).toBe("session=test; Secure");
  });

  it("preserves the forwarded protocol for Better Auth redirects", () => {
    const request = new Request(
      "http://auth:4001/idp/callback/discord?code=test",
      { headers: { "x-forwarded-proto": "https, http" } },
    );

    expect(normalizeBetterAuthRequest(request).url).toBe(
      "https://auth:4001/idp/callback/discord?code=test",
    );
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
    const normalized = normalizeBetterAuthRequest(request);

    expect(normalized.url).toBe("https://auth:4001/idp/sign-in/social");
    expect(await normalized.json()).toEqual({
      provider: "discord",
      disableRedirect: true,
    });
  });

  it("strictly validates and trims idp-token payloads", async () => {
    const { run } = makeRuntime();
    const accepted = await run(
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

    const rejected = await run(
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
