import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyGeneratedAssetReferences } from "./static-assets.mjs";

test("static artifacts use their own namespace and ignore remote assets", () => {
  assert.doesNotThrow(() =>
    verifyGeneratedAssetReferences(
      '<link href="/docs-assets/app.css?v=1"><script src="https://cdn.example/app.js"></script>',
      "docs",
      "guide",
    ),
  );
  assert.throws(() =>
    verifyGeneratedAssetReferences(
      '<script src="/landing-assets/app.js"></script>',
      "docs",
      "guide",
    ),
  );
  assert.throws(() =>
    verifyGeneratedAssetReferences(
      '<script src="https://cdn.example/app.js"></script>',
      "docs",
      "guide",
    ),
  );
});
