import { expect, test } from "bun:test";
import transformOpenApiDocument from "./openapi-transformer.js";

test("OpenAPI component aliases retain nested references and extension data", () => {
  const document = {
    openapi: "3.0.3",
    components: {
      schemas: {
        NotificationTargetResponseDto__schema0: {
          type: "object",
          "x-extra": { flag: true },
        },
        LootShareResponseDto: { type: "object" },
        LootShareResponseDto_Output: { type: "object" },
        Consumer: {
          anyOf: [
            { $ref: "#/components/schemas/LootShareResponseDto_Output" },
            {
              $ref: "#/components/schemas/NotificationTargetResponseDto__schema0",
            },
          ],
        },
      },
    },
  };
  const result = transformOpenApiDocument(document);
  expect(result.components?.schemas?.Consumer).toEqual({
    anyOf: [
      { $ref: "#/components/schemas/LootShareResponseDto" },
      { $ref: "#/components/schemas/JsonValue" },
    ],
  });
  expect(result.components?.schemas?.JsonValue).toEqual({
    type: "object",
    "x-extra": { flag: true },
  });
  expect(result.components?.schemas).not.toHaveProperty(
    "NotificationTargetResponseDto__schema0",
  );
  expect(result.components?.schemas).not.toHaveProperty(
    "LootShareResponseDto_Output",
  );
});

test("documents without components retain their absence", () => {
  const document = { openapi: "3.0.3", paths: {} };
  expect(transformOpenApiDocument(document)).toEqual(document);
});
