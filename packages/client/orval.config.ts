import { defineConfig } from "orval";
import { clientServices } from "./scripts/client-services";

const sharedQueryOverride = {
  shouldExportQueryKey: true,
  useGetQueryData: true,
  useInvalidate: true,
  usePrefetch: true,
  useSetQueryData: true,
} as const;

const projects = Object.entries(clientServices).map(
  ([service, { mutatorName, specPath }]) => {
    const input = {
      override: {
        transformer: "./scripts/openapi-transformer.ts",
      },
      target: specPath,
    };

    return [
      service,
      {
        input,
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
              name: mutatorName,
              path: "./src/mutators.ts",
            },
            query: sharedQueryOverride,
            useNamedParameters: true,
          },
          target: `./src/generated/${service}.ts`,
        },
      },
    ] as const;
  },
);

export default defineConfig(Object.fromEntries(projects));
