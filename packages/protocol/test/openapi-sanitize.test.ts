import { describe, expect, test } from "bun:test";
import { sanitizeOpenApiDocument } from "../src/openapi/sanitize.ts";

describe(sanitizeOpenApiDocument, () => {
  test("preserves legacy query and array schema output", () => {
    const document = {
      parameter: {
        name: "limit",
        in: "query",
        description: "Result limit",
        required: false,
        schema: { type: "string" },
      },
      operation: {
        parameters: [
          {
            name: "limit",
            in: "query",
            description: "Result limit",
            required: false,
            schema: { type: "string" },
          },
          { name: "guildId", in: "path", required: true },
        ],
      },
      arraySchema: {
        type: "array",
        minItems: 1,
        maxItems: 10,
        items: { type: "string" },
      },
    };

    sanitizeOpenApiDocument(document);

    expect(document.parameter.schema).toEqual({});
    expect(document.operation.parameters.map(({ name }) => name)).toEqual([
      "guildId",
      "limit",
    ]);
    expect(Object.keys(document.arraySchema)).toEqual([
      "minItems",
      "maxItems",
      "type",
      "items",
    ]);
  });
});
