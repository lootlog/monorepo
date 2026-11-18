import { defineConfig } from "orval";
import { API_SERVICE_NAMES } from "@lootlog/schema/api-services";
import {
  mutatorsPath,
  openApiTransformerPath,
  serviceMutatorName,
  serviceSpecPath,
} from "./scripts/generation";

const sharedQueryOverride = {
  shouldExportQueryKey: true,
  useGetQueryData: true,
  useInvalidate: true,
  usePrefetch: true,
  useSetQueryData: true,
} as const;

const projects = API_SERVICE_NAMES.map(
  (service) =>
    [
      service,
      {
        input: {
          override: { transformer: openApiTransformerPath },
          target: serviceSpecPath(service),
        },
        output: {
          clean: false,
          client: "react-query" as const,
          httpClient: "fetch" as const,
          mode: "single" as const,
          override: {
            fetch: {
              includeHttpResponseReturnType: false,
            },
            mutator: {
              name: serviceMutatorName(service),
              path: mutatorsPath,
            },
            query: sharedQueryOverride,
            useNamedParameters: true,
          },
          target: `./src/generated/${service}.ts`,
        },
      },
    ] as const,
);

export default defineConfig(Object.fromEntries(projects));
