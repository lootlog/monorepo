import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const releaseWorkflow = readFileSync(
  new URL("../../.github/workflows/release.yml", import.meta.url),
  "utf8",
);

test("uses the Changesets action v2 contract", () => {
  assert.match(releaseWorkflow, /uses: changesets\/action@v2/);

  for (const input of [
    "publish-script",
    "version-script",
    "commit-message",
    "pr-title",
    "create-github-releases",
    "github-token",
    "push-with-git-cli",
  ]) {
    assert.match(releaseWorkflow, new RegExp(`^\\s+${input}:`, "m"));
  }

  assert.match(releaseWorkflow, /outputs\['published-packages'\]/);
  assert.match(releaseWorkflow, /outputs\['pr-number'\]/);
  assert.match(releaseWorkflow, /outputs\.published/);
  assert.match(
    releaseWorkflow,
    /^\s+github-token: \$\{\{ secrets\.GITHUB_TOKEN \}\}$/m,
  );
  assert.doesNotMatch(
    releaseWorkflow,
    /^\s+(?:publish|version|commit|title|createGithubReleases):/m,
  );
  assert.doesNotMatch(
    releaseWorkflow,
    /outputs\.(?:publishedPackages|pullRequestNumber)/,
  );
  assert.doesNotMatch(releaseWorkflow, /^\s+GITHUB_TOKEN:/m);
});
