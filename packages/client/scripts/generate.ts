import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { API_SERVICE_NAMES } from "@lootlog/schema/api-services";
import { fixRequestOptionsType } from "./generation";

const generatedRoot = resolve("src/generated");

const run = (command: string, arguments_: string[]) => {
  const result = spawnSync(command, arguments_, {
    encoding: "utf8",
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `${command} ${arguments_.join(" ")} failed with status ${result.status}`,
    );
  }
};

rmSync(generatedRoot, { force: true, recursive: true });

mkdirSync(generatedRoot, { recursive: true });

for (const service of API_SERVICE_NAMES) {
  run(process.execPath, [
    "x",
    "orval",
    "--config",
    "./orval.config.ts",
    "--project",
    service,
  ]);
}

for (const service of API_SERVICE_NAMES) {
  fixRequestOptionsType(resolve(generatedRoot, `${service}.ts`));
}
