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
const before = new Map<string, string>();
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
  const generatedPath = `${root}/src/generated/${service}.ts`;
  if (check)
    for (const path of [specPath, generatedPath])
      before.set(path, readFileSync(path, "utf8"));
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
  const drift = [...before].filter(
    ([path, previous]) => readFileSync(path, "utf8") !== previous,
  );
  for (const [path, previous] of before) writeFileSync(path, previous);
  if (drift.length)
    throw new Error(
      `Public SDK drift: ${drift.map(([path]) => path).join(", ")}`,
    );
}
