import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const developmentWorkflow = readFileSync(
  new URL("../../.github/workflows/dev-deploy.yml", import.meta.url),
  "utf8",
);

test("loads Landing Vite variables directly from Cloudflare", () => {
  assert.match(developmentWorkflow, /^\s+VITE_ADDON_URL$/mu);
  assert.match(developmentWorkflow, /^\s+VITE_AUTH_SERVICE_URL$/mu);
  assert.match(developmentWorkflow, /echo "\$key=\$value"/u);
  assert.doesNotMatch(developmentWorkflow, /local_key/u);
});
