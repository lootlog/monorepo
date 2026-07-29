import assert from "node:assert/strict";
import test from "node:test";

import {
  createDependabotChangeset,
  selectChangedManifestPaths,
} from "./create-dependabot-changeset.mjs";

test("creates patch releases for workspaces with runtime dependency updates", () => {
  const result = createDependabotChangeset({
    changedManifests: [
      {
        after: {
          dependencies: { zod: "^4.5.0" },
          name: "@lootlog/api",
        },
        before: {
          dependencies: { zod: "^4.4.3" },
          name: "@lootlog/api",
        },
        path: "apps/api/package.json",
      },
      {
        after: {
          dependencies: { react: "^19.3.0" },
          name: "@lootlog/web",
        },
        before: {
          dependencies: { react: "^19.2.8" },
          name: "@lootlog/web",
        },
        path: "apps/web/package.json",
      },
    ],
    pullRequestNumber: 1222,
  });

  assert.deepEqual(result, {
    content: [
      "---",
      '"@lootlog/api": patch',
      '"@lootlog/web": patch',
      "---",
      "",
      "Update runtime dependencies.",
      "",
    ].join("\n"),
    filename: ".changeset/dependabot-pr-1222.md",
  });
});

test("creates an empty changeset for development dependency updates", () => {
  const result = createDependabotChangeset({
    changedManifests: [
      {
        after: {
          devDependencies: { vitest: "^4.2.0" },
          name: "@lootlog/api",
        },
        before: {
          devDependencies: { vitest: "^4.1.10" },
          name: "@lootlog/api",
        },
        path: "apps/api/package.json",
      },
    ],
    pullRequestNumber: 1216,
  });

  assert.deepEqual(result, {
    content: [
      "---",
      "---",
      "",
      "Update development and tooling dependencies.",
      "",
    ].join("\n"),
    filename: ".changeset/dependabot-pr-1216.md",
  });
});

test("creates an empty changeset for root tooling dependency updates", () => {
  const result = createDependabotChangeset({
    changedManifests: [
      {
        after: {
          devDependencies: { wrangler: "^4.115.0" },
          name: "lootlog",
        },
        before: {
          devDependencies: { wrangler: "^4.114.0" },
          name: "lootlog",
        },
        path: "package.json",
      },
    ],
    pullRequestNumber: 1225,
  });

  assert.equal(result?.filename, ".changeset/dependabot-pr-1225.md");
  assert.match(
    result?.content ?? "",
    /Update development and tooling dependencies/,
  );
});

test("accepts only package manifests, the lockfile, and its own changeset", () => {
  assert.deepEqual(
    selectChangedManifestPaths({
      filenames: [
        "pnpm-lock.yaml",
        "apps/api/package.json",
        "package.json",
        ".changeset/dependabot-pr-1225.md",
      ],
      pullRequestNumber: 1225,
    }),
    ["apps/api/package.json", "package.json"],
  );
});

test("rejects unexpected Dependabot files as ambiguous", () => {
  assert.throws(
    () =>
      selectChangedManifestPaths({
        filenames: ["apps/api/package.json", "apps/api/src/main.ts"],
        pullRequestNumber: 1225,
      }),
    /Cannot classify Dependabot file/,
  );
});

test("rejects package manifest changes outside dependency fields", () => {
  assert.throws(
    () =>
      createDependabotChangeset({
        changedManifests: [
          {
            after: {
              name: "@lootlog/api",
              scripts: { build: "new-command" },
            },
            before: {
              name: "@lootlog/api",
              scripts: { build: "old-command" },
            },
            path: "apps/api/package.json",
          },
        ],
        pullRequestNumber: 42,
      }),
    /Cannot classify Dependabot changes/,
  );
});

test("returns no changeset when no release workspace manifest changed", () => {
  assert.equal(
    createDependabotChangeset({
      changedManifests: [],
      pullRequestNumber: 1112,
    }),
    null,
  );
});
