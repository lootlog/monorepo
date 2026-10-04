import { defineConfig } from "orval";
import { sdkServices } from "./scripts/sdk-services";

export default defineConfig(
  Object.fromEntries(
    sdkServices.map(({ service }) => [
      service,
      {
        input: {
          target: `openapi/${service}.json`,
          override: { transformer: "../client/scripts/openapi-transformer.ts" },
        },
        output: {
          target: `src/generated/${service}.ts`,
          client: "fetch",
          mode: "single",
          override: {
            useNamedParameters: true,
            fetch: { includeHttpResponseReturnType: false },
            mutator: { path: "src/mutators.ts", name: `${service}Fetch` },
          },
        },
      },
    ]),
  ),
);
