import assert from "node:assert/strict";
import test from "node:test";

import { createCiPlan } from "./create-ci-plan.mjs";

test("plans quality and Docker checks for an affected service", () => {
  assert.deepEqual(
    createCiPlan({
      affectedPackages: ["@lootlog/api"],
      associatedPullRequestHeads: [],
    }),
    {
      cloudflareTargets: [],
      dockerServices: ["api"],
      packages: ["@lootlog/api"],
      runApiClientCheck: true,
      versionPullRequest: false,
    },
  );
});

test("uses the affected package graph and removes root and duplicate entries", () => {
  assert.deepEqual(
    createCiPlan({
      affectedPackages: [
        "//",
        "@lootlog/ui",
        "@lootlog/web",
        "@lootlog/game-client",
        "@lootlog/web",
      ],
      associatedPullRequestHeads: [],
    }),
    {
      cloudflareTargets: [
        {
          artifactPath: "apps/web/dist",
          packageName: "@lootlog/web",
          project: "lootlog-web-monorepo",
        },
      ],
      dockerServices: [],
      packages: ["@lootlog/game-client", "@lootlog/ui", "@lootlog/web"],
      runApiClientCheck: false,
      versionPullRequest: false,
    },
  );
});

test("skips Docker checks for a Changesets version PR, including merge groups", () => {
  assert.deepEqual(
    createCiPlan({
      affectedPackages: ["@lootlog/api", "@lootlog/auth"],
      associatedPullRequestHeads: ["changeset-release/main"],
    }),
    {
      cloudflareTargets: [],
      dockerServices: [],
      packages: ["@lootlog/api", "@lootlog/auth"],
      runApiClientCheck: true,
      versionPullRequest: true,
    },
  );
});

test("runs the API client check when any OpenAPI producer is affected", () => {
  for (const packageName of [
    "@lootlog/activity",
    "@lootlog/api",
    "@lootlog/auth",
    "@lootlog/battlelog-service",
    "@lootlog/search",
    "@lootlog/api-client",
  ]) {
    assert.equal(
      createCiPlan({
        affectedPackages: [packageName],
        associatedPullRequestHeads: [],
      }).runApiClientCheck,
      true,
    );
  }
});

test("plans development Pages deployments for affected frontend applications", () => {
  assert.deepEqual(
    createCiPlan({
      affectedPackages: ["@lootlog/web", "@lootlog/landing", "@lootlog/ui"],
      associatedPullRequestHeads: [],
    }).cloudflareTargets,
    [
      {
        artifactPath: "apps/landing/dist/client",
        packageName: "@lootlog/landing",
        project: "lootlog-landing",
      },
      {
        artifactPath: "apps/web/dist",
        packageName: "@lootlog/web",
        project: "lootlog-web-monorepo",
      },
    ],
  );
});
