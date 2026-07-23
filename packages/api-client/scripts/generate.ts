import { spawnSync } from "node:child_process";
import { checkOpenApi } from "./check-openapi";
import { fixGeneratedOutput } from "./fix-generated-output";

const services = ["activity", "auth", "battlelog", "main", "search"] as const;
const layers = ["Core", "ReactQuery"] as const;

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

for (const service of services) {
  for (const layer of layers) {
    run("pnpm", [
      "exec",
      "orval",
      "--config",
      "./orval.config.ts",
      "--project",
      `${service}${layer}`,
    ]);
  }
}

fixGeneratedOutput();
