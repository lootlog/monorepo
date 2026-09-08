import { QueryClientProvider } from "@tanstack/react-query";
import { onTestFinished } from "vitest";
import type { ReactNode } from "react";
import { configureApiClients } from "@lootlog/client/transport";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserGameAccountPreferencesQueryKey,
  type UserGameAccountPreferencesResponseDtoOutput,
} from "@lootlog/client/main";
import { createGameAccountPreferences } from "./game-account-preferences-fixtures";
import { queryClient } from "@/lib/query-client";
import { useGlobalStore } from "@/store/global.store";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { npcsDetectionProcessor } from "@/processors/npcs-detection-processor";
import { setTestRuntimeGame } from "./test-runtime-window";
import { createTimerGuildFixture } from "@/features/timers/timer-fixtures";

export const createAccountPreferences = (
  overrides: Partial<UserGameAccountPreferencesResponseDtoOutput> = {},
): UserGameAccountPreferencesResponseDtoOutput =>
  createGameAccountPreferences("202", {
    hasStoredNotifications: false,
    hasStoredDetector: false,
    hasStoredPings: false,
    hasStoredAirTags: false,
    hasStoredPreferences: false,
    ...overrides,
  });
export const createAccountPreferencesTest = (
  respond?: (request: Request) => Response | Promise<Response>,
) => {
  queryClient.clear();
  npcsDetectionProcessor.cleanup();
  useNpcDetectorStore.getState().clearNpcs();
  setTestRuntimeGame();
  useGlobalStore.setState({
    gameState: {
      ...useGlobalStore.getState().gameState,
      gameInitialized: true,
    },
  });
  const queryKey = getUsersControllerGetUserGameAccountPreferencesQueryKey({
    accountId: "202",
  });
  const guildsKey = getUsersControllerGetCurrentUserAccessibleGuildsQueryKey();
  queryClient.setQueryDefaults(guildsKey, {
    staleTime: Infinity,
    retry: false,
  });
  queryClient.setQueryData(guildsKey, [
    createTimerGuildFixture(),
    createTimerGuildFixture({ id: "guild-2", name: "Beta" }),
  ]);
  const requests: Request[] = [];
  const restore = configureApiClients({
    main: {
      baseUrl: "https://api.example.test",
      fetch: (input, init) => {
        const request = new Request(input, init);
        requests.push(request);
        return Promise.resolve(
          respond
            ? respond(request)
            : Response.json(queryClient.getQueryData(queryKey)),
        );
      },
    },
  });
  onTestFinished(() => {
    queryClient.clear();
    npcsDetectionProcessor.cleanup();
    restore();
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, queryKey, guildsKey, requests, wrapper };
};
