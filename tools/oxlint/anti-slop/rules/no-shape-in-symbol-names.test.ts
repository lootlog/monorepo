import { expect, test } from "bun:test";
import { resolve } from "node:path";
import { lintFixture } from "../shared/lint-fixture";

test("checks owned JSX identifiers but permits component props and borrowed members", () => {
  const result = lintFixture(JSON.stringify({
    categories: { correctness: "off" },
    jsPlugins: [{ name: "anti-slop", specifier: resolve(import.meta.dir, "../index.ts") }],
    rules: { "anti-slop/no-shape-in-symbol-names": "error" },
  }), {
    "chart.tsx": [
      "const shapeRenderer = () => null;",
      "const ShapeRenderer = () => null;",
      "const chart = <Bar shape={shapeRenderer} />;",
      "const borrowed = chart.shape;",
      "const owned = <ShapeRenderer />;",
    ].join("\n"),
  });
  expect(result.status).toBe(1);
  expect(result.diagnostics.map((d) => d.message)).toEqual([
    'Rename symbol "shapeRenderer" for its domain role; "shape" describes structure rather than ownership.',
    'Rename symbol "ShapeRenderer" for its domain role; "shape" describes structure rather than ownership.',
    'Rename symbol "shapeRenderer" for its domain role; "shape" describes structure rather than ownership.',
    'Rename symbol "ShapeRenderer" for its domain role; "shape" describes structure rather than ownership.',
  ]);
});
