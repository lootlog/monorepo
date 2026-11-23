import type { AuthIdpTokenResult } from "@lootlog/rpc/auth";
import {
  RpcBadRequestError,
  RpcUnauthorizedError,
  RpcUnavailableError,
} from "@lootlog/rpc/errors";
import { DISCORD_AUTH_SCOPES } from "@lootlog/schema/discord";
import { expect, test } from "bun:test";
import { Effect } from "effect";
import { getAuthTokenCacheKey } from "#src/shared/cache";
import { makeAuthService } from "./auth.service.js";

const memoryRedis = () => {
  const values = new Map<string, string>();
  const ttls = new Map<string, number | undefined>();

  return {
    ttls,
    get: (key: string) => Effect.sync(() => values.get(key) ?? null),
    set: (key: string, value: string, ttlSeconds?: number) =>
      Effect.sync(() => {
        values.set(key, value);
        ttls.set(key, ttlSeconds);
      }),
    getJson: <T>(key: string, codec: { readonly parse: (raw: string) => T }) =>
      Effect.sync(() => {
        const raw = values.get(key);

        return raw === undefined ? null : codec.parse(raw);
      }),
    setJson: <T>(
      key: string,
      value: T,
      ttlSeconds?: number,
      codec?: { readonly stringify: (input: T) => string },
    ) =>
      Effect.sync(() => {
        values.set(key, codec ? codec.stringify(value) : JSON.stringify(value));
        ttls.set(key, ttlSeconds);
      }),
    del: (key: string) =>
      Effect.sync(() => {
        ttls.delete(key);

        return Number(values.delete(key));
      }),
  };
};

const authServiceWith = (
  redis: ReturnType<typeof memoryRedis>,
  respond: () => AuthIdpTokenResult,
) =>
  makeAuthService({
    redis,
    authRpc: {
      getIdpToken: () => Effect.sync(respond),
    },
  });

const issuedToken = (
  accessToken: string,
  expiresIn = 3_600,
  scopes: ReadonlyArray<string> = DISCORD_AUTH_SCOPES,
): AuthIdpTokenResult => ({ accessToken, expiresIn, scopes });

test("Discord token retrieval calls auth RPC with user and discord identity", async () => {
  let received:
    | { readonly userId: string; readonly discordId: string }
    | undefined;

  const service = makeAuthService({
    redis: memoryRedis(),
    authRpc: {
      getIdpToken: (input) => {
        received = input;

        return Effect.succeed(issuedToken("provider-token"));
      },
    },
  });

  await expect(
    Effect.runPromise(service.getIdpToken("user", "discord")),
  ).resolves.toMatchObject({ accessToken: "provider-token" });
  expect(received).toEqual({ userId: "user", discordId: "discord" });
});

for (const [rpcError, expected] of [
  [
    new RpcUnauthorizedError({ message: "Unauthorized" }),
    "AuthServiceUnavailableError",
  ],
  [new RpcUnauthorizedError({ message: "TOKEN_EXPIRED" }), "TokenExpiredError"],
  [new RpcBadRequestError({ message: "TOKEN_NOT_FOUND" }), "TokenExpiredError"],
  [
    new RpcBadRequestError({ message: "ACCOUNT_NOT_FOUND" }),
    "AccountNotFoundError",
  ],
  [
    new RpcUnavailableError({ message: "unavailable" }),
    "AuthServiceUnavailableError",
  ],
] as const) {
  test(`classifies IDP RPC ${rpcError._tag} (${rpcError.message}) as ${expected}`, async () => {
    const service = makeAuthService({
      redis: {
        ...memoryRedis(),
        setJson: () => Effect.die(new Error("Errors must not be cached")),
      },
      authRpc: {
        getIdpToken: () => Effect.fail(rpcError),
      },
    });

    const error = await Effect.runPromise(
      Effect.flip(service.getIdpToken("user", "discord")),
    );

    expect(error.name).toBe(expected);
  });
}

test.each([
  [3_600, 300],
  [90, 30],
  [60, undefined],
  [0, undefined],
])(
  "a token Discord expires in %i seconds is cached for %p seconds",
  async (expiresIn, cachedFor) => {
    const redis = memoryRedis();
    const service = authServiceWith(redis, () => issuedToken("t", expiresIn));

    await Effect.runPromise(service.getIdpToken("user", "discord"));

    expect(redis.ttls.get(getAuthTokenCacheKey("user", "discord"))).toBe(
      cachedFor,
    );
  },
);

test("a token missing required scopes is not cached, so signing in again with them takes effect at once", async () => {
  const redis = memoryRedis();
  let response = issuedToken("narrow", 3_600, ["identify"]);
  const service = authServiceWith(redis, () => response);

  const error = await Effect.runPromise(
    Effect.flip(service.getIdpToken("user", "discord")),
  );

  expect(error.name).toBe("InvalidScopesError");

  response = issuedToken("complete");

  await expect(
    Effect.runPromise(service.getIdpToken("user", "discord")),
  ).resolves.toMatchObject({ accessToken: "complete" });
});

test("a token Discord rejected is not served again, while the token from a new sign-in is used at once", async () => {
  const redis = memoryRedis();
  let response = issuedToken("revoked");
  const service = authServiceWith(redis, () => response);

  await Effect.runPromise(service.getIdpToken("user", "discord"));
  await Effect.runPromise(service.rejectIdpToken("user", "discord", "revoked"));
  await Effect.runPromise(service.rejectIdpToken("user", "discord", "older"));

  response = issuedToken("revoked");

  const error = await Effect.runPromise(
    Effect.flip(service.getIdpToken("user", "discord")),
  );

  expect(error.name).toBe("DiscordTokenRejectedError");

  response = issuedToken("after-sign-in");

  await expect(
    Effect.runPromise(service.getIdpToken("user", "discord")),
  ).resolves.toMatchObject({ accessToken: "after-sign-in" });
});
