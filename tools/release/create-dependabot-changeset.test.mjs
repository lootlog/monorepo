import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyCatalogDependencyUpdate,
  classifyChangedDependencyPaths,
  createDependabotChangeset,
  validateGitHubActionsDependencyUpdate,
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

test("creates an empty changeset for validated GitHub Actions updates", () => {
  const result = createDependabotChangeset({
    changedManifests: [],
    hasToolingChanges: true,
    pullRequestNumber: 1139,
  });

  assert.deepEqual(result, {
    content: [
      "---",
      "---",
      "",
      "Update development and tooling dependencies.",
      "",
    ].join("\n"),
    filename: ".changeset/dependabot-pr-1139.md",
  });
});

test("classifies package manifests, the workspace catalog, and workflows", () => {
  assert.deepEqual(
    classifyChangedDependencyPaths({
      filenames: [
        "bun.lock",
        "apps/api/package.json",
        "package.json",
        ".github/workflows/ci.yml",
        ".changeset/dependabot-pr-1225.md",
      ],
      pullRequestNumber: 1225,
    }),
    {
      catalogPath: "package.json",
      manifestPaths: ["apps/api/package.json", "package.json"],
      toolingPaths: [".github/workflows/ci.yml"],
    },
  );
});

test("creates patch releases for runtime consumers of changed catalog entries", () => {
  const catalogChanges = classifyCatalogDependencyUpdate({
    after: JSON.stringify({
      workspaces: {
        catalog: {
          "@hookform/resolvers": "^5.5.7",
          "@swc/core": "^1.15.47",
        },
        packages: ["apps/*"],
      },
    }),
    before: JSON.stringify({
      workspaces: {
        catalog: {
          "@hookform/resolvers": "^5.4.2",
          "@swc/core": "^1.15.46",
        },
        packages: ["apps/*"],
      },
    }),
    workspaceManifests: [
      {
        dependencies: { "@hookform/resolvers": "catalog:" },
        name: "@lootlog/web",
      },
      {
        devDependencies: { "@swc/core": "catalog:" },
        name: "@lootlog/gateway",
      },
    ],
  });
  const result = createDependabotChangeset({
    catalogChanges,
    changedManifests: [],
    pullRequestNumber: 1237,
  });

  assert.deepEqual(catalogChanges, {
    hasDevelopmentChanges: true,
    runtimePackages: ["@lootlog/web"],
  });
  assert.match(result?.content ?? "", /"@lootlog\/web": patch/);
  assert.doesNotMatch(result?.content ?? "", /"@lootlog\/gateway": patch/);
});

test("creates an empty changeset for development-only catalog updates", () => {
  const catalogChanges = classifyCatalogDependencyUpdate({
    after: JSON.stringify({
      workspaces: { catalog: { "@swc/core": "^1.15.47" } },
    }),
    before: JSON.stringify({
      workspaces: { catalog: { "@swc/core": "^1.15.46" } },
    }),
    workspaceManifests: [
      {
        devDependencies: { "@swc/core": "catalog:" },
        name: "@lootlog/gateway",
      },
    ],
  });
  const result = createDependabotChangeset({
    catalogChanges,
    changedManifests: [],
    pullRequestNumber: 1237,
  });

  assert.deepEqual(catalogChanges, {
    hasDevelopmentChanges: true,
    runtimePackages: [],
  });
  assert.match(
    result?.content ?? "",
    /Update development and tooling dependencies/,
  );
});

test("rejects workspace changes outside catalog version entries", () => {
  assert.throws(
    () =>
      classifyCatalogDependencyUpdate({
        after: JSON.stringify({
          workspaces: { catalog: {}, packages: ["services/*"] },
        }),
        before: JSON.stringify({
          workspaces: { catalog: {}, packages: ["apps/*"] },
        }),
        workspaceManifests: [],
      }),
    /Cannot classify Dependabot changes/,
  );
});

test("rejects unexpected Dependabot files as ambiguous", () => {
  assert.throws(
    () =>
      classifyChangedDependencyPaths({
        filenames: ["apps/api/package.json", "apps/api/src/main.ts"],
        pullRequestNumber: 1225,
      }),
    /Cannot classify Dependabot file/,
  );
});

test("accepts only GitHub Action version changes in workflows", () => {
  assert.doesNotThrow(() =>
    validateGitHubActionsDependencyUpdate({
      after: [
        "jobs:",
        "  test:",
        "    steps:",
        "      - uses: actions/checkout@v7",
        '      - uses: "github/codeql-action/init@v4" # pinned major',
        "",
      ].join("\n"),
      before: [
        "jobs:",
        "  test:",
        "    steps:",
        "      - uses: actions/checkout@v6",
        '      - uses: "github/codeql-action/init@v3" # pinned major',
        "",
      ].join("\n"),
      path: ".github/workflows/ci.yml",
    }),
  );
});

test("rejects other workflow changes as ambiguous", () => {
  assert.throws(
    () =>
      validateGitHubActionsDependencyUpdate({
        after: [
          "jobs:",
          "  test:",
          "    permissions:",
          "      contents: write",
          "    steps:",
          "      - uses: actions/checkout@v7",
          "",
        ].join("\n"),
        before: [
          "jobs:",
          "  test:",
          "    permissions:",
          "      contents: read",
          "    steps:",
          "      - uses: actions/checkout@v6",
          "",
        ].join("\n"),
        path: ".github/workflows/ci.yml",
      }),
    /Cannot classify Dependabot changes/,
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
