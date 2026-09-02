import { expect, test } from "bun:test";
import { Effect, Redacted } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { ForwardAuthIdentity } from "./forward-auth-identity.js";
import {
  forwardAuthMiddleware,
  readForwardAuthIdentity,
} from "./forward-auth-middleware.js";

const requestLayer = (headers: HeadersInit = {}) =>
  Effect.provideService(
    HttpServerRequest.HttpServerRequest,
    HttpServerRequest.fromWeb(
      new Request("http://localhost/protected", { headers }),
    ),
  );

const runProtected = (headers: HeadersInit = {}) =>
  Effect.runPromise(
    forwardAuthMiddleware
      .bearer(
        Effect.map(ForwardAuthIdentity, ({ userId, discordId }) =>
          HttpServerResponse.text(`${userId}:${discordId}`),
        ),
        {
          credential: Redacted.make(""),
          endpoint: undefined as never,
          group: undefined as never,
        },
      )
      .pipe(
        requestLayer(headers),
      ) as Effect.Effect<HttpServerResponse.HttpServerResponse>,
  );

const responseText = (response: HttpServerResponse.HttpServerResponse) => {
  const body = response.body.toJSON() as {
    readonly _tag?: unknown;
    readonly body?: unknown;
  };
  if (body._tag !== "Uint8Array" || typeof body.body !== "string") {
    throw new Error("Expected a text response body");
  }
  return body.body;
};

test("reads the complete trusted forward-auth identity", () => {
  expect(
    readForwardAuthIdentity({
      "x-auth-user-id": " user-1 ",
      "x-auth-discord-id": " discord-1 ",
    }),
  ).toEqual({ userId: "user-1", discordId: "discord-1" });
});

test.each([
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
  expect(responseText(response)).toBe("user-1:discord-1");
});

test("does not accept a bearer credential without trusted forward-auth headers", async () => {
  const response = await runProtected({
    authorization: "Bearer valid-upstream",
  });

  expect(response.status).toBe(401);
});

test("does not execute the protected handler after a failed forward-auth check", async () => {
  let handlerExecuted = false;
  const effect = forwardAuthMiddleware.bearer(
    Effect.sync(() => {
      handlerExecuted = true;
      return HttpServerResponse.empty({ status: 204 });
    }),
    {
      credential: Redacted.make(""),
      endpoint: undefined as never,
      group: undefined as never,
    },
  );

  const response = await Effect.runPromise(
    effect.pipe(
      requestLayer(),
    ) as Effect.Effect<HttpServerResponse.HttpServerResponse>,
  );

  expect(response.status).toBe(401);
  expect(handlerExecuted).toBe(false);
});

test("matches header names case-insensitively through the Web request boundary", async () => {
  const response = await runProtected({
    "X-Auth-User-Id": "user-1",
    "X-Auth-Discord-Id": "discord-1",
  });

  expect(responseText(response)).toBe("user-1:discord-1");
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

  expect(responseText(first)).toBe("user-1:discord-1");
  expect(responseText(second)).toBe("user-2:discord-2");
});
