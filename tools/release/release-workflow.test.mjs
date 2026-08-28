import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const releaseWorkflow = readFileSync(
  new URL("../../.github/workflows/release.yml", import.meta.url),
  "utf8",
);

function getNamedStep(stepName) {
  const stepStart = releaseWorkflow.indexOf(`      - name: ${stepName}`);
  assert.notEqual(stepStart, -1, `workflow step not found: ${stepName}`);

  const nextStepStart = releaseWorkflow.indexOf(
    "\n      - name:",
    stepStart + 1,
  );
  return releaseWorkflow.slice(
    stepStart,
    nextStepStart === -1 ? undefined : nextStepStart,
  );
}

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
  const buildStep = getNamedStep("Build immutable Cloudflare artifact");

  assert.match(
    releaseWorkflow,
    /LANDING_VITE_ADDON_URL: \$\{\{ vars\.LANDING_VITE_ADDON_URL \}\}/u,
  );
  assert.match(
    releaseWorkflow,
    /LANDING_VITE_AUTH_SERVICE_URL: \$\{\{ vars\.LANDING_VITE_AUTH_SERVICE_URL \}\}/u,
  );
  assert.match(buildStep, /export VITE_ADDON_URL="\$LANDING_VITE_ADDON_URL"/u);
  assert.match(
    buildStep,
    /export VITE_AUTH_SERVICE_URL="\$LANDING_VITE_AUTH_SERVICE_URL"/u,
  );
  assert.doesNotMatch(buildStep, /NEXT_PUBLIC_/u);
});

test("smoke-checks Landing and Docs before the rollback boundary closes", () => {
  const smokeStep = getNamedStep("Smoke-check public Cloudflare routes");
  const rollbackStep = getNamedStep("Roll back partial Cloudflare promotion");
  const smokeStepPosition = releaseWorkflow.indexOf(smokeStep);
  const rollbackStepPosition = releaseWorkflow.indexOf(rollbackStep);

  assert.match(smokeStep, /https:\/\/lootlog\.pl\/privacy-policy/u);
  assert.match(smokeStep, /https:\/\/docs\.lootlog\.pl\/api\/search/u);
  assert.ok(
    smokeStepPosition < rollbackStepPosition,
    "public smoke checks must run before the rollback step",
  );
});
