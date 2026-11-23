import { describe, expect, test } from "bun:test";
import { SearchOperationFailure } from "@lootlog/meilisearch/operation-failure";
import { RuntimeEnvironment } from "@lootlog/schema/runtime-environment";
import { Context, Effect, Layer, Redacted } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { CatalogConfig } from "../src/config/catalog-config.js";
import { CATALOG_SERVICE_TOKEN_HEADER } from "@lootlog/protocol/http/catalog-access";
import { CatalogRoutes } from "../src/http-api/catalog-http.js";
import {
  CatalogOperations,
  type CatalogOperationsValue,
} from "../src/http-api/catalog-operations.js";
import {
  CatalogReports,
  type ReportCaller,
  type ReportsModule,
} from "../src/reports/reports.service.js";

const SERVICE_TOKEN = "catalog-service-token-for-http-tests";

const config = CatalogConfig.of({
  environment: RuntimeEnvironment.LOCAL,
  port: 0,
  rpc: { port: 0, callerTokens: {} },
  serviceName: "catalog",
  serviceNamespace: "test",
  databaseUrl: Redacted.make("postgresql://unused"),
  rabbitmqUri: Redacted.make("amqp://unused"),
  meilisearchHost: "http://search.invalid",
  meilisearchApiKey: Redacted.make("unused"),
  serviceToken: Redacted.make(SERVICE_TOKEN),
});

const service = { [CATALOG_SERVICE_TOKEN_HEADER]: SERVICE_TOKEN };

const makeReports = (callers: ReportCaller[]): ReportsModule => {
  const report = {
    id: "4b0f4c8e-8f0e-4d6a-9d43-0d1c1a3b5e6f",
    subjectType: "ITEM",
    gameVersion: "pl",
    subjectId: 1,
    reason: "NOT_IN_GAME",
    comment: null,
    status: "OPEN",
    createdAt: "2026-11-21T00:00:00.000Z",
    reviewedAt: null,
  } as const;

  const record = (caller: ReportCaller) => {
    callers.push(caller);
  };

  return {
    create: (caller) =>
      Effect.sync(() => record(caller)).pipe(Effect.as(report)),
    getOwn: (caller) =>
      Effect.sync(() => record(caller)).pipe(Effect.as({ report: null })),
    withdraw: (caller) => Effect.sync(() => record(caller)),
    viewer: (caller) => {
      record(caller);

      return { canModerate: false };
    },
    list: (caller) =>
      Effect.sync(() => record(caller)).pipe(
        Effect.as({ subjects: [], total: 0 }),
      ),
    review: (caller) => Effect.sync(() => record(caller)),
  };
};

const makeBoundary = (
  overrides: Partial<CatalogOperationsValue> = {},
  reports: ReportsModule = makeReports([]),
) => {
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
      Layer.provide(Layer.succeed(CatalogReports, reports)),
      Layer.provide(Layer.succeed(CatalogConfig, config)),
      Layer.provide(HttpServer.layerServices),
    ),
    { disableLogger: true },
  );

  const handler = (
    path: string,
    headers: Record<string, string> = service,
    init: RequestInit = {},
  ) =>
    boundary.handler(
      new Request(`http://localhost${path}`, { ...init, headers }),
      Context.make(CatalogOperations, operations).pipe(
        Context.add(CatalogReports, reports),
      ),
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
    expect(await response.json()).toEqual({
      code: "SERVICE_UNAVAILABLE",
      message: "Service unavailable",
    });
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

test("reports come from the signed-in User the edge names, never a service or an API key", async () => {
  const callers: ReportCaller[] = [];
  const boundary = makeBoundary({}, makeReports(callers));

  const report = {
    method: "POST",
    body: JSON.stringify({
      subjectType: "ITEM",
      gameVersion: "pl",
      subjectId: 1,
      reason: "NOT_IN_GAME",
    }),
  };

  const user = {
    "x-auth-user-id": "user-1",
    "x-auth-discord-id": "discord-1",
    "content-type": "application/json",
  };

  try {
    expect(
      (
        await boundary.handler(
          "/catalog/reports",
          {
            ...service,
            "content-type": "application/json",
          },
          report,
        )
      ).status,
    ).toBe(401);

    const keyed = await boundary.handler(
      "/catalog/reports",
      {
        ...user,
        "x-auth-api-key-access": JSON.stringify({
          keyId: "key",
          organizationIds: [],
          mode: "read-write",
          personalData: true,
          expiresAt: null,
        }),
      },
      report,
    );

    expect(keyed.status).toBe(403);
    expect(callers).toEqual([]);

    expect(
      (await boundary.handler("/catalog/reports", user, report)).status,
    ).toBe(201);
    expect(
      (
        await boundary.handler("/catalog/reports?status=OPEN", {
          ...user,
          "x-auth-roles": "wiki-moderator",
        })
      ).status,
    ).toBe(200);
    expect(callers).toEqual([
      { userId: "user-1", roles: [] },
      { userId: "user-1", roles: ["wiki-moderator"] },
    ]);
  } finally {
    await boundary.dispose();
  }
});
