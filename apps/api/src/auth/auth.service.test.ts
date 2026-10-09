import { expect, test } from "bun:test";
import { DISCORD_AUTH_SCOPES } from "@lootlog/schema/discord";
import { Effect, Redacted } from "effect";
import { httpClientFromResponses } from "../../test/http-fixtures.js";
import type { JsonCodec } from "#src/redis/redis.service";
import { applicationLogger } from "#src/shared/application-logger";
import { getAuthTokenCacheKey } from "#src/shared/cache";
import { AuthService } from "./auth.service.js";

const memoryRedis = () => {
  const values = new Map<string, string>();
  const ttls = new Map<string, number | undefined>();

  return {
    ttls,
    get: async (key: string) => values.get(key) ?? null,
    set: async (key: string, value: string, ttlSeconds?: number) => {
      values.set(key, value);
      ttls.set(key, ttlSeconds);
    },
    getJson: async <T>(key: string, codec: JsonCodec<T>) => {
      const value = values.get(key);

      return value === undefined ? null : codec.parse(value);
    },
    setJson: async <T>(
      key: string,
      value: T,
      ttlSeconds?: number,
      codec?: Pick<JsonCodec<T>, "stringify">,
    ) => {
      values.set(key, codec ? codec.stringify(value) : JSON.stringify(value));
      ttls.set(key, ttlSeconds);
    },
    del: async (key: string) => {
      ttls.delete(key);

      return Number(values.delete(key));
    },
  };
};

const authServiceWith = (
  redis: ReturnType<typeof memoryRedis>,
  respond: () => Response,
) =>
  new AuthService(
    applicationLogger,
    redis,
    httpClientFromResponses(() => Effect.sync(respond)),
    new URL("http://auth.test"),
    Redacted.make("idp-test-secret"),
  );

const issuedToken = (
  accessToken: string,
  expiresIn = 3_600,
  scopes: ReadonlyArray<string> = DISCORD_AUTH_SCOPES,
) => Response.json({ accessToken, expiresIn, scopes });

test("Discord token retrieval authenticates the API service without forwarding user credentials", async () => {
  let authorization: string | undefined;

  const service = new AuthService(
    applicationLogger,
    memoryRedis(),
    httpClientFromResponses((request) => {
      authorization = request.headers.authorization;
      expect(request.url).toBe("http://auth.test/auth/idp-token");

      return Effect.succeed(issuedToken("provider-token"));
    }),
    new URL("http://auth.test"),
    Redacted.make("idp-test-secret"),
  );

  await expect(
    Effect.runPromise(service.getIdpToken("user", "discord")),
  ).resolves.toMatchObject({ accessToken: "provider-token" });
  expect(authorization).toBe("Bearer idp-test-secret");
});

for (const [status, body, expected] of [
  [
    401,
    { message: "Unauthorized", statusCode: 401 },
    "AuthServiceUnavailableError",
  ],
  [401, { error: "TOKEN_EXPIRED" }, "TokenExpiredError"],
  [400, { error: "TOKEN_NOT_FOUND" }, "TokenExpiredError"],
  [400, { error: "ACCOUNT_NOT_FOUND" }, "AccountNotFoundError"],
] as const) {
  test(`classifies IDP ${status} ${JSON.stringify(body)} as ${expected}`, async () => {
    const service = new AuthService(
      applicationLogger,
      {
        ...memoryRedis(),
        setJson: async () => {
          throw new Error("Errors must not be cached");
        },
      },
      httpClientFromResponses(() =>
        Effect.succeed(Response.json(body, { status })),
      ),
      new URL("http://auth.test"),
      Redacted.make("rejected-service-secret"),
    );

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
  // A late 401 for an older token must not lift the newer token's rejection.
  await Effect.runPromise(service.rejectIdpToken("user", "discord", "older"));

  // The auth service still holds the revoked token until the user signs in.
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
