import { defineConfig } from "orval";

const services = {
  activity: {
    mutatorName: "activityFetch",
    specPath: "../../apps/activity/openapi.yaml",
  },
  auth: {
    mutatorName: "authFetch",
    specPath: "../../apps/auth/openapi.yaml",
  },
  battlelog: {
    mutatorName: "battlelogFetch",
    specPath: "../../apps/battlelog/openapi.yaml",
  },
  main: {
    mutatorName: "mainFetch",
    specPath: "../../apps/api/openapi.yaml",
  },
  search: {
    mutatorName: "searchFetch",
    specPath: "../../apps/search/openapi.yaml",
  },
} as const;

const sharedQueryOverride = {
  shouldExportQueryKey: true,
  useGetQueryData: true,
  useInvalidate: true,
  usePrefetch: true,
  useSetQueryData: true,
} as const;

const projects = Object.entries(services).map(
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
