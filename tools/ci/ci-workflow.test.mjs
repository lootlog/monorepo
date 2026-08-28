import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ciWorkflow = readFileSync(
  new URL("../../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

const dockerJob = ciWorkflow.match(
  /^  docker:\n([\s\S]*?)^  ci-success:/m,
)?.[1];

test("scans affected Docker images with Trivy before merge", () => {
  assert.ok(dockerJob, "Docker job must exist");
  assert.match(
    dockerJob,
    /^    permissions:\n      contents: read\n      security-events: write$/m,
  );
  assert.match(dockerJob, /^          load: true$/m);
  assert.match(dockerJob, /uses: aquasecurity\/trivy-action@v0\.36\.0/);
  assert.match(dockerJob, /^          version: v0\.74\.0$/m);
  assert.match(
    dockerJob,
    /^          image-ref: lootlog-\$\{\{ matrix\.service \}\}:ci$/m,
  );
  assert.match(dockerJob, /^          severity: HIGH,CRITICAL$/m);
  assert.match(dockerJob, /^          exit-code: "1"$/m);
  assert.match(dockerJob, /^          ignore-unfixed: true$/m);
  assert.match(dockerJob, /^          limit-severities-for-sarif: true$/m);
});

test("uploads a service-specific SARIF report even when Trivy blocks CI", () => {
  assert.ok(dockerJob, "Docker job must exist");
  assert.match(
    dockerJob,
    /- name: Upload Trivy results to GitHub Security\n        if: always\(\)\n        uses: github\/codeql-action\/upload-sarif@v4/,
  );
  assert.match(dockerJob, /^          sarif_file: trivy-results\.sarif$/m);
  assert.match(
    dockerJob,
    /^          category: trivy-\$\{\{ matrix\.service \}\}$/m,
  );
});

test("allows skipped Docker jobs to satisfy the aggregate CI result", () => {
  assert.match(ciWorkflow, /\.result == "success" or \.result == "skipped"/);
});
