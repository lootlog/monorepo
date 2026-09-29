import { expect, test } from "bun:test";
import { projectOpenApi } from "./project-openapi";
import type { JsonValue } from "../../client/scripts/openapi-document";
import { PUBLIC_API_OPERATIONS } from "@lootlog/schema/public-api-policy";

type JsonObject = { [key: string]: JsonValue };

test("public projection excludes unknown operations and private schemas but retains transitive refs", () => {
  const operations = PUBLIC_API_OPERATIONS.filter(
    (entry) => entry.service === "search" && entry.access !== "session-only",
  );

  const paths = Object.fromEntries(
    operations.map((entry) => [
      entry.path,
      {
        get: {
          operationId: entry.operationId,
          responses: {
            200: {
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Public" },
                },
              },
            },
          },
        },
      },
    ]),
  );

  const projected = projectOpenApi(
    {
      openapi: "3.1.0",
      info: { title: "Search", version: "1" },
      paths: {
        ...paths,
        "/secret": { get: { operationId: "newUnreviewedOperation" } },
      },
      components: {
        schemas: {
          Public: {
            properties: { item: { $ref: "#/components/schemas/Item" } },
          },
          Item: { type: "string" },
          Secret: { type: "string" },
        },
      },
    },
    "search",
  );

  expect(projected.paths).not.toHaveProperty("/secret");
  expect(projected.components).toHaveProperty("schemas.Item");
  expect(projected.components).not.toHaveProperty("schemas.Secret");
});

test("projection fails if an approved operation disappears or changes identity", () => {
  expect(() => projectOpenApi({ paths: {} }, "search")).toThrow(
    "Missing public operation",
  );
});

test("projection keeps session-only parameters out of the published feed call", () => {
  const operations = PUBLIC_API_OPERATIONS.filter(
    (entry) => entry.service === "main" && entry.access !== "session-only",
  );

  const paths: { [path: string]: JsonObject } = {};

  for (const entry of operations)
    paths[entry.path] = {
      ...paths[entry.path],
      [entry.method.toLowerCase()]: {
        operationId: entry.operationId,
        parameters:
          entry.path === "/users/@me/feed"
            ? [
                { name: "excludedGuildIds", in: "query" },
                { name: "withLootOnly", in: "query" },
              ]
            : [],
      },
    };

  const projected = projectOpenApi({ paths }, "main");

  expect(projected.paths).toHaveProperty(
    ["/users/@me/feed", "get", "parameters"],
    [],
  );
});
