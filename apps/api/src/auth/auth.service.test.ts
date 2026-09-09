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
