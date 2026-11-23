import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { API_SERVICE_NAMES } from "@lootlog/schema/api-services";
import { fixRequestOptionsType } from "./generation";

const generatedRoot = resolve("src/generated");

const run = (command: string, arguments_: string[]) => {
  const result = Bun.spawnSync([command, ...arguments_], {
    stdio: ["inherit", "inherit", "inherit"],
  });

  if (!result.success) {
    throw new Error(
      `${command} ${arguments_.join(" ")} failed with status ${result.exitCode}`,
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
