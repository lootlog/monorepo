import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { lintFixture } from "../shared/lint-fixture";

test("record guards retain unknown values while domain dictionaries and unchecked typeof stay forbidden", () => {
  const result = lintFixture(JSON.stringify({
    categories: { correctness: "off" },
    jsPlugins: [{ name: "anti-slop", specifier: resolve(import.meta.dir, "../index.ts") }],
    rules: {
      "anti-slop/no-runtime-typeof": ["error", { allowInTypeGuards: true }],
      "anti-slop/no-unsafe-dictionary-type": "error",
    },
  }), {
    "boundary.ts": [
      "function isRecord(value: unknown): value is Record<string, unknown> {",
      '  return typeof value === "object" && value !== null && !Array.isArray(value);',
      "}",
      "function isUnchecked(value: unknown): value is Record<string, any> {",
      "  return isRecord(value);",
      "}",
      "const domain: Record<string, unknown> = {};",
      "function domainWork(value: unknown) {",
      '  return typeof value === "string";',
      "}",
    ].join("\n"),
  });
  expect(result.status).toBe(1);
  expect(result.diagnostics.map((d) => d.code).sort()).toEqual([
    "anti-slop(no-runtime-typeof)",
    "anti-slop(no-unsafe-dictionary-type)",
    "anti-slop(no-unsafe-dictionary-type)",
  ]);
});

test("reviewed raw document dictionaries do not exempt domain aliases", () => {
  const result = lintFixture(JSON.stringify({
    categories: { correctness: "off" },
    jsPlugins: [{ name: "anti-slop", specifier: resolve(import.meta.dir, "../index.ts") }],
    rules: {
      "anti-slop/no-unsafe-dictionary-type": ["error", { boundaryTypes: ["RawDocument"] }],
    },
  }), {
    "document.ts": [
      "type RawDocument = Record<string, unknown>;",
      "type Envelope = { raw: RawDocument };",
      "type DomainState = Record<string, unknown>;",
      "const inline: Record<string, unknown> = {};",
    ].join("\n"),
  });
  expect(result.status).toBe(1);
  expect(result.diagnostics.map((d) => d.code)).toEqual([
    "anti-slop(no-unsafe-dictionary-type)",
    "anti-slop(no-unsafe-dictionary-type)",
  ]);
});
