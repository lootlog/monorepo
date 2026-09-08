import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { lintFixture } from "../shared/lint-fixture";

test("permits only exact external renderer mocks in the reviewed file", () => {
  const result = lintFixture(JSON.stringify({
    categories: { correctness: "off" },
    jsPlugins: [{ name: "anti-slop", specifier: resolve(import.meta.dir, "../index.ts") }],
    rules: { "anti-slop/no-module-mocking": "error" },
    overrides: [{ files: ["renderer.ts"], rules: {
      "anti-slop/no-module-mocking": ["error", { externalModules: ["lottie-react", "./internal"] }],
    } }],
  }), {
    "renderer.ts": [
      'import { vi } from "vitest";',
      'vi.mock("lottie-react");',
      'vi.mock("lottie-react/internal");',
      'vi.mock("./internal");',
      'vi.mock(moduleName);',
    ].join("\n"),
    "domain.ts": 'import { vi } from "vitest"; vi.mock("lottie-react");',
  });
  expect(result.status).toBe(1);
  expect(result.diagnostics.map((item) => item.filename).sort()).toEqual([
    "domain.ts", "renderer.ts", "renderer.ts", "renderer.ts",
  ]);
});
