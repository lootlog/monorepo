import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];
const budgetScriptPath = path.resolve(
  process.cwd(),
  "scripts/check-bundle-budget.mjs",
);

const createTemporaryBundle = async (contents: Uint8Array | string) => {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), "game-client-bundle-budget-"),
  );
  temporaryDirectories.push(temporaryDirectory);
  const bundlePath = path.join(temporaryDirectory, "game-client.user.js");
  await writeFile(bundlePath, contents);
  return bundlePath;
};

const createDeterministicNoise = (byteCount: number): Uint8Array => {
  const bytes = new Uint8Array(byteCount);
  let state = 0x1234_5678;

  for (let index = 0; index < byteCount; index += 1) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    bytes[index] = state >>> 24;
  }

  return bytes;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

describe("check-bundle-budget", () => {
  it("passes a bundle below both release compression budgets", async () => {
    const bundlePath = await createTemporaryBundle(
      "console.log('small release bundle');\n",
    );
    const result = spawnSync(
      process.execPath,
      [budgetScriptPath, "--bundle", bundlePath],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("gzip");
    expect(result.stdout).toContain("brotli");
    expect(result.stdout).toContain("460,000 B");
    expect(result.stdout).toContain("363,000 B");
    expect(result.stdout).toContain("PASS");
  });

  it("fails a bundle above the hard release budgets", async () => {
    const bundlePath = await createTemporaryBundle(
      createDeterministicNoise(600_000),
    );
    const result = spawnSync(
      process.execPath,
      [budgetScriptPath, "--bundle", bundlePath],
      { encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stdout).toContain("FAIL");
    expect(result.stderr).toContain("Release bundle budget exceeded");
  });
});
