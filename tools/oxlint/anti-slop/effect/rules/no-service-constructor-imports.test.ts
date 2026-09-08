import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { lintFixture } from "../../shared/lint-fixture";

test("type-only constructor references do not introduce runtime dependencies", () => {
  const result = lintFixture(JSON.stringify({
    categories: { correctness: "off" },
    jsPlugins: [{ name: "anti-slop-effect", specifier: resolve(import.meta.dir, "../index.ts") }],
    rules: { "anti-slop-effect/no-service-constructor-imports": "error" },
  }), {
    "consumer.ts": [
      'import type { makeRepository } from "./repository";',
      'import { type makeClient, makeService as createService } from "./service";',
      'type Repository = ReturnType<typeof makeRepository>;',
    ].join("\n"),
  });
  expect(result.status).toBe(1);
  expect(result.diagnostics.map((diagnostic) => diagnostic.message.match(/"([^"]+)"/)?.[1]))
    .toEqual(["makeService"]);
});

test("permits reviewed pure factories only in their configured file", () => {
  const result = lintFixture(JSON.stringify({
    categories: { correctness: "off" },
    jsPlugins: [{ name: "anti-slop-effect", specifier: resolve(import.meta.dir, "../index.ts") }],
    rules: { "anti-slop-effect/no-service-constructor-imports": "error" },
    overrides: [{
      files: ["chart.ts"],
      rules: {
        "anti-slop-effect/no-service-constructor-imports": [
          "error", { nonServiceImports: ["makeRuleId"] },
        ],
      },
    }],
  }), {
    "chart.ts": [
      'import { makeRuleId } from "./ids";',
      'import { makeRepository } from "./repository";',
    ].join("\n"),
    "domain.ts": 'import { makeRuleId } from "./ids";',
  });
  expect(result.status).toBe(1);
  expect(result.diagnostics.map((d) =>
    [d.filename, d.message.match(/"([^"]+)"/)?.[1]],
  ).sort()).toEqual([
    ["chart.ts", "makeRepository"],
    ["domain.ts", "makeRuleId"],
  ]);
});
