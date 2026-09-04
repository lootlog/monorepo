import { describe, expect, test } from "bun:test";
import { SearchOperationFailure } from "../src/meilisearch/search-operation-failure.js";
import { Effect, Layer } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import {
  SearchOperations,
  type SearchOperationsValue,
} from "../src/http-api/search-operations.js";
import { SearchRoutes } from "../src/http-api/search-http.js";

const makeBoundary = (overrides: Partial<SearchOperationsValue> = {}) => {
  let itemQuery: unknown;
  const operations: SearchOperationsValue = {
    searchItems: (query) => {
      itemQuery = query;
      return Effect.succeed({
        hits: [],
        estimatedTotalHits: 0,
        facetDistribution: {},
        facetStats: {},
      });
    },
    searchNpcs: () => Effect.succeed([]),
    searchPlayers: () => Effect.succeed([]),
    searchAll: () => Effect.succeed({ items: [], npcs: [], players: [] }),
    indexItems: () => Effect.void,
    indexNpcs: () => Effect.void,
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
  const handler = boundary.handler as (request: Request) => Promise<Response>;
  return {
    handler,
    dispose: boundary.dispose,
    readItemQuery: () => itemQuery,
  };
};

describe("Search HttpApi contract", () => {
  test("preserves the health status", async () => {
    const { dispose, handler } = makeBoundary();
    const response = await handler(new Request("http://localhost/healthz"));
    expect(response.status).toBe(200);
    await dispose();
  });

  test("decodes the item query through the HTTP contract", async () => {
    const { dispose, handler, readItemQuery } = makeBoundary();
    const response = await handler(
      new Request(
        "http://localhost/items?limit=5&offset=2&facets=rarity&facets=type&filter=world%20%3D%20berufs",
      ),
    );
    expect(response.status).toBe(200);
    expect(readItemQuery()).toEqual({
      limit: 5,
      offset: 2,
      filter: "world = berufs",
      facets: ["rarity", "type"],
    });
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
    expect(await response.json()).toMatchObject({ _tag: "SearchUnavailable" });
  } finally {
    await boundary.dispose();
  }
});
