import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createCiPlan } from "../ci/create-ci-plan.mjs";

const developmentWorkflow = readFileSync(
  new URL("../../.github/workflows/dev-deploy.yml", import.meta.url),
  "utf8",
);
const docsWranglerConfig = JSON.parse(
  readFileSync(
    new URL("../../apps/docs/wrangler.jsonc", import.meta.url),
    "utf8",
  ),
);

test("deploys Docs through an isolated development Worker", () => {
  const plan = createCiPlan({ affectedPackages: ["@lootlog/docs"] });

  assert.deepEqual(plan.cloudflareTargets, [
    {
      artifactPath: "apps/docs/dist/client",
      configPath: "apps/docs/wrangler.jsonc",
      environment: "develop",
      kind: "worker",
      packageName: "@lootlog/docs",
      project: "lootlog-docs-develop",
    },
  ]);
  assert.equal(docsWranglerConfig.name, "lootlog-docs");
  assert.equal(docsWranglerConfig.env.develop.name, "lootlog-docs-develop");
  assert.notEqual(
    docsWranglerConfig.env.develop.name,
    docsWranglerConfig.name,
    "development must not overwrite the production Worker",
  );
  assert.equal(docsWranglerConfig.env.develop.workers_dev, true);
  assert.match(developmentWorkflow, /if: matrix\.kind == 'pages'/u);
  assert.match(developmentWorkflow, /pnpm exec wrangler deploy \\/u);
  assert.match(developmentWorkflow, /--config "\$CONFIG_PATH" \\/u);
  assert.match(developmentWorkflow, /--env "\$WRANGLER_ENV" \\/u);
  assert.match(developmentWorkflow, /--keep-vars/u);
});

test("keeps Pages development targets and skips version pull requests", () => {
  const featurePlan = createCiPlan({
    affectedPackages: ["@lootlog/landing"],
  });
  const versionPlan = createCiPlan({
    affectedPackages: ["@lootlog/docs", "@lootlog/landing"],
    associatedPullRequestHeads: ["changeset-release/main"],
  });

  assert.deepEqual(featurePlan.cloudflareTargets, [
    {
      artifactPath: "apps/landing/dist/client",
      kind: "pages",
      packageName: "@lootlog/landing",
      project: "lootlog-landing",
    },
  ]);
  assert.deepEqual(versionPlan.cloudflareTargets, []);
});
