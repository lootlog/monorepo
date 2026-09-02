import { describe, expect, test } from "bun:test";
import { normalizeOpenApiNullable } from "./normalize-openapi-nullable.js";

describe("normalizeOpenApiNullable", () => {
  test("converts OpenAPI 3.0 nullable schemas to JSON Schema unions", () => {
    const normalized = normalizeOpenApiNullable({
      type: "object",
      properties: {
        state: { type: "string", enum: ["READY"], nullable: true },
      },
    });

    expect(normalized).toEqual({
      type: "object",
      properties: {
        state: {
          anyOf: [{ type: "string", enum: ["READY"] }, { type: "null" }],
        },
      },
    });
  });

  test("keeps references into nullable ancestor schemas resolvable", () => {
    const normalized = normalizeOpenApiNullable({
      components: {
        schemas: {
          Parent: {
            nullable: true,
            type: "object",
            properties: {
              child: { type: "string" },
            },
          },
          Child: {
            $ref: "#/components/schemas/Parent/properties/child",
          },
        },
      },
    });

    expect(normalized).toMatchObject({
      components: {
        schemas: {
          Child: {
            $ref: "#/components/schemas/Parent/anyOf/0/properties/child",
          },
        },
      },
    });
  });

  test("keeps legacy open object markers when creating nullable unions", () => {
    const normalized = normalizeOpenApiNullable({
      nullable: true,
      type: "object",
      properties: { id: { type: "string" } },
      allOf: [{ type: "object", additionalProperties: {} }],
    });

    expect(normalized).toEqual({
      anyOf: [
        {
          type: "object",
          properties: { id: { type: "string" } },
          additionalProperties: {},
        },
        { type: "null" },
      ],
    });
  });

  test("does not redirect a reference to the nullable union itself", () => {
    const normalized = normalizeOpenApiNullable({
      components: {
        schemas: {
          Value: { type: "string", nullable: true },
          Alias: { $ref: "#/components/schemas/Value" },
        },
      },
    });

    expect(normalized).toMatchObject({
      components: {
        schemas: {
          Alias: { $ref: "#/components/schemas/Value" },
        },
      },
    });
  });

  test("normalizes every nullable schema in the checked-in API contract", async () => {
    const source = Bun.YAML.parse(
      await Bun.file(new URL("../../openapi.yaml", import.meta.url)).text(),
    );
    const normalized = normalizeOpenApiNullable(source);
    let nullableKeywords = 0;
    let nullBranches = 0;
    const references: string[] = [];

    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const item of value) visit(item);
        return;
      }
      if (value === null || typeof value !== "object") return;

      for (const [key, item] of Object.entries(value)) {
        if (key === "nullable") nullableKeywords += 1;
        if (
          key === "type" &&
          item === "null" &&
          Object.keys(value).length === 1
        ) {
          nullBranches += 1;
        }
        if (key === "$ref" && typeof item === "string") references.push(item);
        visit(item);
      }
    };
    visit(normalized);

    const resolveReference = (reference: string): unknown => {
      if (!reference.startsWith("#/")) return {};
      return reference
        .slice(2)
        .split("/")
        .map((token) => token.replaceAll("~1", "/").replaceAll("~0", "~"))
        .reduce<unknown>((current, token) => {
          if (current === null || typeof current !== "object") return undefined;
          return (current as Record<string, unknown>)[token];
        }, normalized);
    };

    expect(nullableKeywords).toBe(0);
    expect(nullBranches).toBe(544);
    expect(
      references.filter(
        (reference) => resolveReference(reference) === undefined,
      ),
    ).toEqual([]);
  });
});
