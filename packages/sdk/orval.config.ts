import { defineConfig } from "orval";
import {
  mutatorsPath,
  openApiTransformerPath,
  serviceMutatorName,
} from "@lootlog/client/scripts/generation";
import { PUBLIC_API_SERVICES } from "@lootlog/schema/api-services";

export default defineConfig(
  Object.fromEntries(
    PUBLIC_API_SERVICES.map((service) => [
      service,
      {
        input: {
          target: `openapi/${service}.json`,
          override: { transformer: openApiTransformerPath },
        },
        output: {
          target: `src/generated/${service}.ts`,
          client: "fetch",
          mode: "single",
          override: {
            useNamedParameters: true,
            fetch: { includeHttpResponseReturnType: false },
            mutator: { path: mutatorsPath, name: serviceMutatorName(service) },
          },
        },
      },
    ]),
  ),
);
