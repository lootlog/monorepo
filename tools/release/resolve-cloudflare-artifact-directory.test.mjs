import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { resolveCloudflareArtifactDirectory } from "./resolve-cloudflare-artifact-directory.mjs";

const artifactName = "cloudflare-lootlog-web-monorepo-1.2.4-0123456789abcdef";

async function createArtifactFiles(directory) {
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "cloudflare-artifact.tar.gz"), "");
  await writeFile(
    path.join(directory, "cloudflare-artifact.tar.gz.sha256"),
    "",
  );
}

async function withTemporaryDirectory(callback) {
  const directory = await mkdtemp(
    path.join(tmpdir(), "cloudflare-artifact-test-"),
  );

  try {
    await callback(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("resolves a single artifact extracted directly into the download root", async () => {
  await withTemporaryDirectory(async (downloadRoot) => {
    await createArtifactFiles(downloadRoot);

    assert.equal(
      await resolveCloudflareArtifactDirectory(downloadRoot, artifactName),
      downloadRoot,
    );
  });
});

test("resolves an artifact extracted into its named directory", async () => {
  await withTemporaryDirectory(async (downloadRoot) => {
    const artifactDirectory = path.join(downloadRoot, artifactName);
    await createArtifactFiles(artifactDirectory);

    assert.equal(
      await resolveCloudflareArtifactDirectory(downloadRoot, artifactName),
      artifactDirectory,
    );
  });
});

test("rejects a missing artifact", async () => {
  await withTemporaryDirectory(async (downloadRoot) => {
    await assert.rejects(
      resolveCloudflareArtifactDirectory(downloadRoot, artifactName),
      /Cloudflare artifact files were not found/,
    );
  });
});

test("rejects an ambiguous direct and named artifact layout", async () => {
  await withTemporaryDirectory(async (downloadRoot) => {
    await createArtifactFiles(downloadRoot);
    await createArtifactFiles(path.join(downloadRoot, artifactName));

    await assert.rejects(
      resolveCloudflareArtifactDirectory(downloadRoot, artifactName),
      /Cloudflare artifact layout is ambiguous/,
    );
  });
});
