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

test("builds Landing exclusively with Vite variable names", () => {
  assert.match(
    releaseWorkflow,
    /LANDING_VITE_ADDON_URL: \$\{\{ vars\.LANDING_VITE_ADDON_URL \}\}/u,
  );
  assert.match(
    releaseWorkflow,
    /LANDING_VITE_AUTH_SERVICE_URL: \$\{\{ vars\.LANDING_VITE_AUTH_SERVICE_URL \}\}/u,
  );
  assert.match(
    releaseWorkflow,
    /export VITE_ADDON_URL="\$LANDING_VITE_ADDON_URL"/u,
  );
  assert.match(
    releaseWorkflow,
    /export VITE_AUTH_SERVICE_URL="\$LANDING_VITE_AUTH_SERVICE_URL"/u,
  );
});

test("smoke-checks Landing and Docs before the rollback boundary closes", () => {
  assert.match(releaseWorkflow, /Smoke-check public Cloudflare routes/u);
  assert.match(releaseWorkflow, /https:\/\/lootlog\.pl\/privacy-policy/u);
  assert.match(releaseWorkflow, /https:\/\/docs\.lootlog\.pl\/api\/search/u);
  assert.match(releaseWorkflow, /Roll back partial Cloudflare promotion/u);
});
