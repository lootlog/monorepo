import { defineConfig } from "orval";

const sharedQueryOverride = {
  shouldExportQueryKey: true,
  useGetQueryData: true,
  useInvalidate: true,
  useMutation: true,
  usePrefetch: true,
  useQuery: true,
  useSetQueryData: true,
} as const;

const createReactQueryConfig = ({
  inputTarget,
  outputTarget,
  schemasTarget,
  mutatorPath,
  mutatorName,
}: {
  inputTarget: string;
  outputTarget: string;
  schemasTarget: string;
  mutatorPath: string;
  mutatorName: string;
}) => ({
  input: {
    target: inputTarget,
  },
  output: {
    clean: true,
    client: "react-query" as const,
    httpClient: "fetch" as const,
    mode: "tags-split" as const,
    namingConvention: "kebab-case" as const,
    override: {
      fetch: {
        includeHttpResponseReturnType: false,
      },
      mutator: {
        name: mutatorName,
        path: mutatorPath,
      },
      query: sharedQueryOverride,
      useNamedParameters: true,
    },
    schemas: schemasTarget,
    target: outputTarget,
  },
});

const createAppServiceConfigs = ({
  appName,
  mutatorPath,
  services,
}: {
  appName: "web" | "game-client";
  mutatorPath: string;
  services: Array<{
    configName: string;
    serviceName: "activity" | "auth" | "battlelog" | "main" | "search";
    specPath: string;
    mutatorName: string;
  }>;
}) => {
  return Object.fromEntries(
    services.map(({ configName, serviceName, specPath, mutatorName }) => [
      configName,
      createReactQueryConfig({
        inputTarget: specPath,
        mutatorName,
        mutatorPath,
        outputTarget: `./apps/${appName}/src/lib/api/generated/${serviceName}/index.ts`,
        schemasTarget: `./apps/${appName}/src/lib/api/generated/${serviceName}/model`,
      }),
    ]),
  );
};

const webConfigs = createAppServiceConfigs({
  appName: "web",
  mutatorPath: "./apps/web/src/lib/api/orval-fetch.ts",
  services: [
    {
      configName: "webMainApi",
      serviceName: "main",
      specPath: "./apps/api/openapi.yaml",
      mutatorName: "orvalFetch",
    },
    {
      configName: "webAuthApi",
      serviceName: "auth",
      specPath: "./apps/auth/openapi.yaml",
      mutatorName: "orvalFetchAuth",
    },
    {
      configName: "webBattlelogApi",
      serviceName: "battlelog",
      specPath: "./apps/battlelog-service/openapi.yaml",
      mutatorName: "orvalFetchBattlelog",
    },
    {
      configName: "webSearchApi",
      serviceName: "search",
      specPath: "./apps/search/openapi.yaml",
      mutatorName: "orvalFetchSearch",
    },
    {
      configName: "webActivityApi",
      serviceName: "activity",
      specPath: "./apps/activity/openapi.yaml",
      mutatorName: "orvalFetchActivity",
    },
  ],
});

const gameClientConfigs = createAppServiceConfigs({
  appName: "game-client",
  mutatorPath: "./apps/game-client/src/lib/api/orval-fetch.ts",
  services: [
    {
      configName: "gameClientMainApi",
      serviceName: "main",
      specPath: "./apps/api/openapi.yaml",
      mutatorName: "orvalFetch",
    },
    {
      configName: "gameClientAuthApi",
      serviceName: "auth",
      specPath: "./apps/auth/openapi.yaml",
      mutatorName: "orvalFetchAuth",
    },
    {
      configName: "gameClientBattlelogApi",
      serviceName: "battlelog",
      specPath: "./apps/battlelog-service/openapi.yaml",
      mutatorName: "orvalFetchBattlelog",
    },
  ],
});

export default defineConfig({
  ...webConfigs,
  ...gameClientConfigs,
});
