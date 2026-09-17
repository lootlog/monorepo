import { Schema } from "effect";

const decodeDocument = Schema.decodeUnknownSync(
  Schema.Record(Schema.String, Schema.Json),
);

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { projectOpenApi } from "./project-openapi";

const root = resolve(import.meta.dirname, "..");

const check = process.argv.includes("--check");

mkdirSync(`${root}/openapi`, { recursive: true });

mkdirSync(`${root}/src/generated`, { recursive: true });

for (const [service, app] of Object.entries({
  main: "api",
  activity: "activity",
  battlelog: "battlelog",
  search: "search",
})) {
  if (
    service !== "main" &&
    service !== "activity" &&
    service !== "battlelog" &&
    service !== "search"
  )
    throw new Error("Unknown service");
  const specPath = `${root}/openapi/${service}.json`;
  writeFileSync(
    specPath,
    `${JSON.stringify(projectOpenApi(decodeDocument(parse(readFileSync(`${root}/../../apps/${app}/openapi.yaml`, "utf8"))), service), null, 2)}\n`,
  );
}

const result = spawnSync(
  process.execPath,
  ["x", "orval", "--config", "orval.config.ts"],
  { cwd: root, stdio: "inherit" },
);

if (result.status !== 0) throw new Error("Public SDK generation failed");

for (const service of ["main", "activity", "battlelog", "search"]) {
  const path = `${root}/src/generated/${service}.ts`;
  writeFileSync(
    path,
    readFileSync(path, "utf8").replaceAll(
      "options?: RequestInit",
      `options?: Parameters<typeof ${service}Fetch>[1]`,
    ),
  );
}

const formatting = spawnSync(
  process.execPath,
  [
    "x",
    "oxfmt",
    ...["main", "activity", "battlelog", "search"].map(
      (service) => `${root}/openapi/${service}.json`,
    ),
  ],
  { cwd: root, stdio: "inherit" },
);

if (formatting.status !== 0)
  throw new Error("Public OpenAPI formatting failed");

if (check) {
  const status = Bun.spawnSync(
    [
      "git",
      "status",
      "--porcelain=v1",
      "--untracked-files=all",
      "--",
      "packages/sdk/openapi",
      "packages/sdk/src/generated",
    ],
    { cwd: resolve(root, "../.."), stdout: "pipe", stderr: "inherit" },
  );

  if (status.exitCode !== 0)
    throw new Error("Unable to inspect generated public SDK files");
  const drift = status.stdout.toString().trim();

  if (drift) throw new Error(`Public SDK drift:\n${drift}`);
}
