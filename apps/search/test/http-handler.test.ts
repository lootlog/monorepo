import { describe, expect, test } from "bun:test";
import { SearchOperationFailure } from "@lootlog/meilisearch/operation-failure";
import { Context, Effect, Layer, Predicate } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import {
  SearchOperations,
  type SearchOperationsValue,
} from "../src/http-api/search-operations.js";
import { SearchRoutes } from "../src/http-api/search-http.js";

const makeBoundary = (overrides: Partial<SearchOperationsValue> = {}) => {
  const operations: SearchOperationsValue = {
    searchPlayers: () => Effect.succeed([]),
    indexPlayers: () => Effect.void,
    ...overrides,
  };

  const boundary = HttpRouter.toWebHandler(
    SearchRoutes.pipe(
      Layer.provide(Layer.succeed(SearchOperations, operations)),
      Layer.provide(HttpServer.layerServices),
    ),
    { disableLogger: true },
  );

  const handler = (request: Request) =>
    boundary.handler(request, Context.make(SearchOperations, operations));

  return { handler, dispose: boundary.dispose };
};

describe("Search HttpApi contract", () => {
  test("preserves the health status", async () => {
    const { dispose, handler } = makeBoundary();
    const response = await handler(new Request("http://localhost/healthz"));
    expect(response.status).toBe(200);
    await dispose();
  });

  test("returns 404 for unknown paths", async () => {
    const { dispose, handler } = makeBoundary();
    const response = await handler(new Request("http://localhost/private"));
    expect(response.status).toBe(404);
    await dispose();
  });
});

test("a search outage is an explicit unavailable response, not an empty success", async () => {
  const boundary = makeBoundary({
    searchPlayers: () =>
      Effect.fail(
        new SearchOperationFailure({
          operation: "search.players",
          cause: new Error("upstream unavailable"),
        }),
      ),
  });

  try {
    const response = await boundary.handler(
      new Request("http://localhost/players?limit=10"),
    );

    expect(response.status).toBe(503);
    expect(Predicate.isTagged("SearchUnavailable")(await response.json())).toBe(
      true,
    );
  } finally {
    await boundary.dispose();
  }
});

test("allows scoped keys to search players and denies malformed or unsupported key access", async () => {
  const boundary = makeBoundary();

  const headers = {
    "x-auth-user-id": "user",
    "x-auth-discord-id": "discord",
    "x-auth-api-key-access": JSON.stringify({
      keyId: "key",
      organizationIds: ["123"],
      mode: "read",
      personalData: false,
      expiresAt: null,
    }),
  };

  try {
    const response = await boundary.handler(
      new Request("http://localhost/players?limit=10", { headers }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(
      (
        await boundary.handler(
          new Request("http://localhost/healthz", { headers }),
        )
      ).status,
    ).toBe(403);
    headers["x-auth-api-key-access"] = "invalid";
    expect(
      (
        await boundary.handler(
          new Request("http://localhost/players", { headers }),
        )
      ).status,
    ).toBe(401);
  } finally {
    await boundary.dispose();
  }
});
