import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { pruneProductionDeploy } from "./prune-production-deploy.mjs";

test("removes only TypeScript platform packages from a production deployment", async () => {
  const targetDirectory = await mkdtemp(join(tmpdir(), "lootlog-prod-deploy-"));
  const virtualStoreDirectory = join(targetDirectory, "node_modules", ".pnpm");
  const platformPackageDirectory = join(
    virtualStoreDirectory,
    "@typescript+typescript-linux-x64@7.0.2",
  );
  const retainedPackageDirectory = join(
    virtualStoreDirectory,
    "@prisma+client@7.10.0",
  );

  try {
    await Promise.all([
      mkdir(platformPackageDirectory, { recursive: true }),
      mkdir(retainedPackageDirectory, { recursive: true }),
    ]);

    const removedPackages = await pruneProductionDeploy(targetDirectory);

    assert.deepEqual(removedPackages, [
      "@typescript+typescript-linux-x64@7.0.2",
    ]);
    await assert.rejects(() => readdir(platformPackageDirectory));
    await assert.doesNotReject(() => readdir(retainedPackageDirectory));
  } finally {
    await rm(targetDirectory, { force: true, recursive: true });
  }
});
