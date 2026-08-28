import { readdir, rm } from "node:fs/promises";
import { isAbsolute, join, parse, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const TYPESCRIPT_PLATFORM_PACKAGE_PREFIX = "@typescript+typescript-";

export async function pruneProductionDeploy(targetDirectory) {
  if (!targetDirectory) {
    throw new Error("A production deployment directory is required.");
  }

  const resolvedTargetDirectory = resolve(targetDirectory);
  if (
    !isAbsolute(resolvedTargetDirectory) ||
    resolvedTargetDirectory === parse(resolvedTargetDirectory).root
  ) {
    throw new Error("Refusing to prune an unsafe deployment directory.");
  }

  const virtualStoreDirectory = join(
    resolvedTargetDirectory,
    "node_modules",
    ".pnpm",
  );
  const entries = await readdir(virtualStoreDirectory, { withFileTypes: true });
  const platformPackageNames = entries
    .filter(
      (entry) =>
        entry.isDirectory() &&
        entry.name.startsWith(TYPESCRIPT_PLATFORM_PACKAGE_PREFIX),
    )
    .map((entry) => entry.name)
    .sort();

  await Promise.all(
    platformPackageNames.map((packageName) =>
      rm(join(virtualStoreDirectory, packageName), {
        force: true,
        recursive: true,
      }),
    ),
  );

  return platformPackageNames;
}

const isCommandLineInvocation =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCommandLineInvocation) {
  try {
    const removedPackages = await pruneProductionDeploy(process.argv[2]);
    process.stdout.write(
      `Removed ${removedPackages.length} TypeScript platform package(s) from the production deployment.\n`,
    );
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
