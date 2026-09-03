import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { checkOpenApi } from "./check-openapi";
import { fixGeneratedOutput } from "./fix-generated-output";

const services = ["activity", "auth", "battlelog", "main", "search"] as const;
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

checkOpenApi();
rmSync(generatedRoot, { force: true, recursive: true });
mkdirSync(generatedRoot, { recursive: true });

for (const service of services) {
  run(process.execPath, [
    "x",
    "orval",
    "--config",
    "./orval.config.ts",
    "--project",
    service,
  ]);
}

fixGeneratedOutput();
