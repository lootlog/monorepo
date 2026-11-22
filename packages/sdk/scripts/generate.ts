import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import {
  assertNoGeneratedDrift,
  decodeJsonObject,
  fixRequestOptionsType,
  serviceSpecPath,
} from "@lootlog/client/scripts/generation";
import { PUBLIC_API_SERVICES } from "@lootlog/schema/api-services";
import { projectOpenApi } from "./project-openapi";

const root = resolve(import.meta.dirname, "..");

const check = process.argv.includes("--check");

mkdirSync(`${root}/openapi`, { recursive: true });

mkdirSync(`${root}/src/generated`, { recursive: true });

for (const service of PUBLIC_API_SERVICES) {
  const specPath = `${root}/openapi/${service}.json`;
  writeFileSync(
    specPath,
    `${JSON.stringify(projectOpenApi(decodeJsonObject(parse(readFileSync(serviceSpecPath(service), "utf8"))), service), null, 2)}\n`,
  );
}

const result = spawnSync(
  process.execPath,
  ["x", "orval", "--config", "orval.config.ts"],
  { cwd: root, stdio: "inherit" },
);

if (result.status !== 0) throw new Error("Public SDK generation failed");

for (const service of PUBLIC_API_SERVICES) {
  const generatedPath = `${root}/src/generated/${service}.ts`;
  writeFileSync(
    generatedPath,
    readFileSync(generatedPath, "utf8").replace(
      /(from\s*["'])[^"']*\/client\/src\/mutators(["'])/,
      "$1@lootlog/client/mutators$2",
    ),
  );
  fixRequestOptionsType(generatedPath);
}

const formatting = spawnSync(
  process.execPath,
  [
    "x",
    "oxfmt",
    ...PUBLIC_API_SERVICES.map((service) => `${root}/openapi/${service}.json`),
  ],
  { cwd: root, stdio: "inherit" },
);

if (formatting.status !== 0)
  throw new Error("Public OpenAPI formatting failed");

if (check) {
  assertNoGeneratedDrift(
    ["packages/sdk/openapi", "packages/sdk/src/generated"],
    "Public SDK files",
  );
}
