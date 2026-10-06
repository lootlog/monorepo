import { spawnSync } from "node:child_process";
import { relative, resolve } from "node:path";
import { clientServices } from "./client-services";

const repositoryRoot = resolve("../..");

const trackedOutputs = [
  ...Object.values(clientServices).map(({ specPath }) =>
    relative(repositoryRoot, resolve(specPath)),
  ),
  "apps/discord-bot/openapi.yaml",
  "apps/gateway/openapi.yaml",
  "packages/client/src/generated",
];

const result = spawnSync(
  "git",
  [
    "status",
    "--porcelain=v1",
    "--untracked-files=all",
    "--",
    ...trackedOutputs,
  ],
  {
    cwd: repositoryRoot,
    encoding: "utf8",
  },
);

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  throw new Error(
    `Unable to inspect generated files (status ${result.status})`,
  );
}

if (result.stdout.trim()) {
  process.stderr.write(result.stdout);
  throw new Error("Generated API clients or OpenAPI specifications are stale");
}
