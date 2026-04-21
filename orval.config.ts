import { defineConfig } from "orval";

export default defineConfig({
  mainApi: {
    input: {
      target: "./apps/api/openapi.yaml",
    },
    output: {
      clean: true,
      client: "react-query",
      httpClient: "fetch",
      mode: "tags-split",
      namingConvention: "kebab-case",
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          name: "orvalFetch",
          path: "./apps/web/src/lib/api/orval-fetch.ts",
        },
        query: {
          shouldExportQueryKey: true,
          useGetQueryData: true,
          useInvalidate: true,
          useMutation: true,
          usePrefetch: true,
          useQuery: true,
          useSetQueryData: true,
        },
        useNamedParameters: true,
      },
      schemas: "./apps/web/src/lib/api/generated/main/model",
      target: "./apps/web/src/lib/api/generated/main/index.ts",
    },
  },
  gameClientApi: {
    input: {
      target: "./apps/api/openapi.yaml",
    },
    output: {
      clean: true,
      client: "react-query",
      httpClient: "fetch",
      mode: "tags-split",
      namingConvention: "kebab-case",
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          name: "orvalFetch",
          path: "./apps/game-client/src/lib/api/orval-fetch.ts",
        },
        query: {
          shouldExportQueryKey: true,
          useGetQueryData: true,
          useInvalidate: true,
          useMutation: true,
          usePrefetch: true,
          useQuery: true,
          useSetQueryData: true,
        },
        useNamedParameters: true,
      },
      schemas: "./apps/game-client/src/lib/api/generated/main/model",
      target: "./apps/game-client/src/lib/api/generated/main/index.ts",
    },
  },
});
