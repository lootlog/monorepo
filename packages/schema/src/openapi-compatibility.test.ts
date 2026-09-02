import { describe, expect, it } from "bun:test";
import {
  preserveOpenApi30Contract,
  setOpenApiCompatibilityValue,
} from "./openapi-compatibility.js";

describe("OpenAPI compatibility", () => {
  it("keeps the deployed OpenAPI 3.0 parameter and nullable shapes", () => {
    const document = {
      openapi: "3.1.0",
      info: { title: "Test", version: "1" },
      paths: {
        "/items": {
          get: {
            operationId: "getItems",
            security: [],
            parameters: [
              {
                name: "limit",
                in: "query",
                schema: { type: "string", pattern: "number" },
              },
            ],
            responses: {
              200: {
                description: "Success",
                content: {
                  "application/json": {
                    schema: {
                      anyOf: [{ type: "string" }, { type: "null" }],
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: { schemas: {}, securitySchemes: {} },
      security: [],
      tags: [{ name: "items" }],
    };

    preserveOpenApi30Contract(
      document,
      { "getItems:limit": { schema: { type: "integer", minimum: 1 } } },
      { "getItems:200": "Items" },
    );

    expect(document).toMatchObject({
      openapi: "3.0.0",
      paths: {
        "/items": {
          get: {
            parameters: [
              {
                name: "limit",
                in: "query",
                schema: { type: "integer", minimum: 1 },
              },
            ],
            responses: {
              200: {
                description: "Items",
                content: {
                  "application/json": {
                    schema: { nullable: true, type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  it("sets an explicit legacy value only on an existing path", () => {
    const document = { components: { schemas: { Item: {} } } };
    setOpenApiCompatibilityValue(
      document,
      ["components", "schemas", "Item", "additionalProperties"],
      {},
    );
    expect(document.components.schemas.Item).toEqual({
      additionalProperties: {},
    });
  });
});
