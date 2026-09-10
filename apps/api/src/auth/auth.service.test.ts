import { expect, test } from "bun:test";
import { Effect, Redacted } from "effect";
import { httpClientFromResponses } from "../../test/http-fixtures.js";
import { applicationLogger } from "#src/shared/application-logger";
import { AuthService } from "./auth.service.js";

test("Discord token retrieval authenticates the API service without forwarding user credentials", async () => {
  let authorization: string | undefined;

  const service = new AuthService(
    applicationLogger,
    {
      getJson: async () => null,
      setJson: async () => {},
      del: async () => 0,
      deleteByPattern: async () => 0,
    },
    httpClientFromResponses((request) => {
      authorization = request.headers.authorization;
      expect(request.url).toBe("http://auth.test/auth/idp-token");

      return Effect.succeed(
        Response.json({
          accessToken: "provider-token",
          expiresIn: 60,
          scopes: ["identify"],
        }),
      );
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
        getJson: async () => null,
        setJson: async () => {
          throw new Error("Errors must not be cached");
        },
        del: async () => 0,
        deleteByPattern: async () => 0,
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
