import assert from "node:assert/strict";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { findUncoveredWorkspaces } from "./validate-workspace-changesets.mjs";

test("reports a changed workspace that is missing from the release plan", () => {
  const uncoveredWorkspaces = findUncoveredWorkspaces({
    changedFiles: ["apps/api/src/main.ts", "packages/ui/src/button.tsx"],
    changesetFiles: [
      {
        content: '---\n"@lootlog/ui": patch\n---\n\nImprove the button.',
        path: ".changeset/friendly-ui.md",
      },
    ],
    releases: [{ name: "@lootlog/ui" }],
    workspaces: [
      { name: "@lootlog/api", path: "apps/api" },
      { name: "@lootlog/ui", path: "packages/ui" },
    ],
  });

  assert.deepEqual(uncoveredWorkspaces, ["@lootlog/api"]);
});

test("accepts changed workspaces when the pull request contains an empty changeset", () => {
  const uncoveredWorkspaces = findUncoveredWorkspaces({
    changedFiles: ["apps/api/src/main.ts"],
    changesetFiles: [
      {
        content: "---\n---\n\nNo release required.",
        path: ".changeset/no-release.md",
      },
    ],
    releases: [],
    workspaces: [{ name: "@lootlog/api", path: "apps/api" }],
  });

  assert.deepEqual(uncoveredWorkspaces, []);
});

test("CLI fails when one changed workspace is missing from the changeset release plan", () => {
  const repositoryDirectory = mkdtempSync(
    join(tmpdir(), "workspace-changesets-"),
  );
  const fakeBinDirectory = join(repositoryDirectory, "bin");

  mkdirSync(join(repositoryDirectory, "apps/api/src"), { recursive: true });
  mkdirSync(join(repositoryDirectory, "packages/ui/src"), { recursive: true });
  mkdirSync(join(repositoryDirectory, ".changeset"));
  mkdirSync(fakeBinDirectory);

  writeFileSync(
    join(repositoryDirectory, "apps/api/package.json"),
    '{"name":"@lootlog/api"}',
  );
  writeFileSync(
    join(repositoryDirectory, "packages/ui/package.json"),
    '{"name":"@lootlog/ui"}',
  );
  writeFileSync(join(repositoryDirectory, "apps/api/src/main.ts"), "initial");
  writeFileSync(
    join(repositoryDirectory, "packages/ui/src/button.tsx"),
    "initial",
  );

  const git = (...arguments_) =>
    spawnSync("git", arguments_, {
      cwd: repositoryDirectory,
      encoding: "utf8",
    });

  git("init");
  git("config", "user.email", "ci@example.com");
  git("config", "user.name", "CI");
  git("add", ".");
  git("commit", "-m", "initial");
  const baseRef = git("rev-parse", "HEAD").stdout.trim();

  writeFileSync(join(repositoryDirectory, "apps/api/src/main.ts"), "changed");
  writeFileSync(
    join(repositoryDirectory, "packages/ui/src/button.tsx"),
    "changed",
  );
  writeFileSync(
    join(repositoryDirectory, ".changeset/ui-only.md"),
    '---\n"@lootlog/ui": patch\n---\n\nUpdate UI.',
  );
  git("add", ".");
  git("commit", "-m", "change api and ui");

  const fakePnpmPath = join(fakeBinDirectory, "pnpm");
  writeFileSync(
    fakePnpmPath,
    `#!/bin/sh
for argument in "$@"; do
  case "$argument" in
    --output=*) output_file="\${argument#--output=}" ;;
  esac
done
printf '%s' '{"releases":[{"name":"@lootlog/ui"}]}' > "$output_file"
`,
  );
  chmodSync(fakePnpmPath, 0o755);

  const scriptPath = fileURLToPath(
    new URL("./validate-workspace-changesets.mjs", import.meta.url),
  );
  const result = spawnSync(process.execPath, [scriptPath, baseRef], {
    cwd: repositoryDirectory,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${fakeBinDirectory}:${process.env.PATH}`,
    },
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /@lootlog\/api/);
});
