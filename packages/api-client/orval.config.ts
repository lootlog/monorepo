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
    specPath: "../../apps/battlelog-service/openapi.yaml",
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

const projects = Object.entries(services).flatMap(
  ([service, { mutatorName, specPath }]) => {
    const schemas = {
      path: `./src/generated/models/${service}`,
      type: "typescript" as const,
    };
    const sharedOutput = {
      clean: true,
      indexFiles: false,
      mode: "tags-split" as const,
      namingConvention: "kebab-case" as const,
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          name: mutatorName,
          path: "./src/mutators.ts",
        },
        useNamedParameters: true,
      },
      schemas,
    };
    const input = {
      override: {
        transformer: "./scripts/openapi-transformer.ts",
      },
      target: specPath,
    };

    return [
      [
        `${service}Core`,
        {
          input,
          output: {
            ...sharedOutput,
            client: "fetch" as const,
            target: `./src/generated/core/${service}/index.ts`,
          },
        },
      ],
      [
        `${service}ReactQuery`,
        {
          input,
          output: {
            ...sharedOutput,
            client: "react-query" as const,
            httpClient: "fetch" as const,
            override: {
              ...sharedOutput.override,
              query: sharedQueryOverride,
            },
            target: `./src/generated/react-query/${service}/index.ts`,
          },
        },
      ],
    ] as const;
  },
);

export default defineConfig(Object.fromEntries(projects));
