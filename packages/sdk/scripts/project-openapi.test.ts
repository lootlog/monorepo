import { expect, test } from "bun:test";
import { projectOpenApi } from "./project-openapi";
import { PUBLIC_API_OPERATIONS } from "@lootlog/schema/public-api-policy";

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
