import { describe, expect, test } from "bun:test";
import { SearchOperationFailure } from "@lootlog/meilisearch/operation-failure";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Context, Effect, Layer, Predicate, Redacted } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { CatalogConfig } from "../src/config/catalog-config.js";
import { CATALOG_SERVICE_TOKEN_HEADER } from "@lootlog/protocol/http/catalog-access";
import { CatalogRoutes } from "../src/http-api/catalog-http.js";
import {
  CatalogOperations,
  type CatalogOperationsValue,
} from "../src/http-api/catalog-operations.js";

const SERVICE_TOKEN = "catalog-service-token-for-http-tests";

const config = CatalogConfig.of({
  environment: RuntimeEnvironment.LOCAL,
  port: 0,
  serviceName: "catalog",
  serviceNamespace: "test",
  databaseUrl: Redacted.make("postgresql://unused"),
  rabbitmqUri: Redacted.make("amqp://unused"),
  meilisearchHost: "http://search.invalid",
  meilisearchApiKey: Redacted.make("unused"),
  serviceToken: Redacted.make(SERVICE_TOKEN),
});

const service = { [CATALOG_SERVICE_TOKEN_HEADER]: SERVICE_TOKEN };

const makeBoundary = (overrides: Partial<CatalogOperationsValue> = {}) => {
  const operations: CatalogOperationsValue = {
    catalogItems: () => Effect.succeed({ hits: [], estimatedTotalHits: 0 }),
    catalogNpcs: () => Effect.succeed({ hits: [], estimatedTotalHits: 0 }),
    catalogEvents: () => Effect.succeed({ events: [] }),
    catalogIndex: () => Effect.succeed({ items: [], npcs: [] }),
    indexItems: () => Effect.void,
    setMonsterDrops: () => Effect.void,
    setItemRevisions: () => Effect.void,
    indexNpcs: () => Effect.void,
    setNpcLocations: () => Effect.void,
    ...overrides,
  };

  const boundary = HttpRouter.toWebHandler(
    CatalogRoutes.pipe(
      Layer.provide(Layer.succeed(CatalogOperations, operations)),
      Layer.provide(Layer.succeed(CatalogConfig, config)),
      Layer.provide(HttpServer.layerServices),
    ),
    { disableLogger: true },
  );

  const handler = (path: string, headers: Record<string, string> = service) =>
    boundary.handler(
      new Request(`http://localhost${path}`, { headers }),
      Context.make(CatalogOperations, operations),
    );

  return {
    handler,
    dispose: boundary.dispose,
  };
};

describe("Catalog HttpApi contract", () => {
  test("decodes the catalog filters from one value or several", async () => {
    const queries: unknown[] = [];

    const { dispose, handler } = makeBoundary({
      catalogItems: (query) => {
        queries.push(query);

        return Effect.succeed({ hits: [], estimatedTotalHits: 0 });
      },
    });

    for (const search of [
      "rarities=LEGENDARY&sort=lvl:desc",
      "rarities=LEGENDARY&rarities=HEROIC&droppedBy=pl_template_7001_2",
    ]) {
      expect((await handler(`/catalog/items?${search}`)).status).toBe(200);
    }

    expect(queries).toEqual([
      { rarities: ["LEGENDARY"], sort: "lvl:desc" },
      { rarities: ["LEGENDARY", "HEROIC"], droppedBy: "pl_template_7001_2" },
    ]);
    await dispose();
  });
});

test("a search outage is an explicit unavailable response, not an empty success", async () => {
  const boundary = makeBoundary({
    catalogItems: () =>
      Effect.fail(
        new SearchOperationFailure({
          operation: "catalog.items",
          cause: new Error("upstream unavailable"),
        }),
      ),
  });

  try {
    const response = await boundary.handler("/catalog/items");

    expect(response.status).toBe(503);
    expect(Predicate.isTagged("SearchUnavailable")(await response.json())).toBe(
      true,
    );
  } finally {
    await boundary.dispose();
  }
});

test("reads need the service token or an identity from the edge, and keys stay scoped", async () => {
  const boundary = makeBoundary();

  const status = async (path: string, headers: Record<string, string>) =>
    (await boundary.handler(path, headers)).status;

  const keyHeaders = {
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
    // Probes need no caller.
    expect(await status("/healthz", {})).toBe(200);
    expect(await status("/catalog/items", {})).toBe(401);
    expect(
      await status("/catalog/items", {
        [CATALOG_SERVICE_TOKEN_HEADER]: `${SERVICE_TOKEN}-forged`,
      }),
    ).toBe(401);
    expect(await status("/catalog/items", service)).toBe(200);
    expect(
      await status("/catalog/npcs", {
        "x-auth-user-id": "user",
        "x-auth-discord-id": "discord",
      }),
    ).toBe(200);

    // A key reads every catalog read the developer portal lists.
    for (const path of [
      "/catalog/items",
      "/catalog/npcs",
      "/catalog/events",
      "/catalog/index",
    ]) {
      expect({ path, status: await status(path, keyHeaders) }).toEqual({
        path,
        status: 200,
      });
    }

    expect(
      await status("/catalog/items", {
        ...keyHeaders,
        "x-auth-api-key-access": "invalid",
      }),
    ).toBe(401);
  } finally {
    await boundary.dispose();
  }
});
