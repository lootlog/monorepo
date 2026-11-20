import { BearerSecurityMiddleware } from "#src/contracts/api-shared";
import { BunHttpServer } from "@effect/platform-bun";
import {
  HttpApi,
  HttpApiBuilder,
  HttpApiEndpoint,
  HttpApiGroup,
} from "effect/http-api";
import { expect, test } from "bun:test";
import { Effect, Layer, Schema } from "effect";
import { HttpRouter, HttpServerResponse } from "effect/http";
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { ForwardAuthMiddlewareLive } from "#src/runtime/auth/forward-auth-middleware";

const endpoint = HttpApiEndpoint.get("protected", "/protected", {
  success: Schema.String,
});

const group = HttpApiGroup.make("protected")
  .add(endpoint)
  .middleware(BearerSecurityMiddleware);

const api = HttpApi.make("test").add(group);

const runProtected = async (
  headers: HeadersInit = {},
  handler: Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    never,
    ForwardAuthIdentity
  > = Effect.map(ForwardAuthIdentity, ({ userId, discordId }) =>
    HttpServerResponse.text(`${userId}:${discordId}`),
  ),
) => {
  const boundary = HttpRouter.toWebHandler(
    HttpApiBuilder.layer(api).pipe(
      Layer.provide(
        HttpApiBuilder.group(api, "protected", (handlers) =>
          handlers.handleRaw("protected", () => handler),
        ),
      ),
      Layer.provide(ForwardAuthMiddlewareLive),
      Layer.provide(BunHttpServer.layerHttpServices),
    ),
    { disableLogger: true },
  );

  try {
    return await boundary.handler(
      new Request("http://localhost/protected", { headers }),
    );
  } finally {
    await boundary.dispose();
  }
};

test.each<Record<string, string>>([
  {},
  { "x-auth-user-id": "user-1" },
  { "x-auth-discord-id": "discord-1" },
  { "x-auth-user-id": " ", "x-auth-discord-id": "discord-1" },
])("fails closed for missing or incomplete identity: %o", async (headers) => {
  const response = await runProtected(headers);

  expect(response.status).toBe(401);
});

test("provides the request identity without requiring an Authorization header", async () => {
  const response = await runProtected({
    "x-auth-user-id": "user-1",
    "x-auth-discord-id": "discord-1",
  });

  expect(response.status).toBe(200);
  expect(await response.text()).toBe("user-1:discord-1");
});

test("does not accept a bearer credential without trusted forward-auth headers", async () => {
  const response = await runProtected({
    authorization: "Bearer valid-upstream",
  });

  expect(response.status).toBe(401);
});

test("does not execute the protected handler after a failed forward-auth check", async () => {
  let handlerExecuted = false;

  const response = await runProtected(
    {},
    Effect.sync(() => {
      handlerExecuted = true;

      return HttpServerResponse.empty({ status: 204 });
    }),
  );

  expect(response.status).toBe(401);
  expect(handlerExecuted).toBe(false);
});

test("keeps concurrent request identities isolated", async () => {
  const [first, second] = await Promise.all([
    runProtected({
      "x-auth-user-id": "user-1",
      "x-auth-discord-id": "discord-1",
    }),
    runProtected({
      "x-auth-user-id": "user-2",
      "x-auth-discord-id": "discord-2",
    }),
  ]);

  expect(await first.text()).toBe("user-1:discord-1");
  expect(await second.text()).toBe("user-2:discord-2");
});
