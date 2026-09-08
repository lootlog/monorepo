import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { onTestFinished, vi } from "vitest";
import type { ReactNode } from "react";
import { configureApiClients } from "@lootlog/client/transport";
import {
  getSettingsDocumentsControllerGetPreferencesQueryKey,
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  getUsersControllerGetUserPreferencesUrl,
  type GuildResponseDtoOutput,
  type UserPreferencesResponseDtoOutput,
} from "@lootlog/client/main";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";

export const createTestGuild = (
  id: string,
  name: string,
): GuildResponseDtoOutput => ({
  id,
  name,
  icon: null,
  vanityUrl: null,
  ownerId: "owner",
  publicStatsCardEnabled: false,
  groupFightsEnabled: true,
  groupFightsIncludeIncomplete: false,
  reservationMaxDurationMinutes: 240,
  reservationMinDurationMinutes: 15,
  reservationTimeGranularityMinutes: 15,
  reservationMaxAdvanceDays: 7,
  reservationActiveLimitPerSpot: 1,
});
export const createGuildPreferencesTest = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  const preferencesKey = getUsersControllerGetUserPreferencesQueryKey();
  const guildsKey = getUsersControllerGetCurrentUserAccessibleGuildsQueryKey();
  const setPreferences = (
    overrides: Partial<UserPreferencesResponseDtoOutput> = {},
  ) =>
    queryClient.setQueryData<UserPreferencesResponseDtoOutput>(preferencesKey, {
      userId: "user",
      guildsOrder: [],
      hiddenGuildIds: [],
      theme: "default",
      chatAppearance: CHAT_APPEARANCE_READABLE_PRESET,
      mutes: { players: [], npcs: [] },
      ...overrides,
    });
  setPreferences();
  queryClient.setQueryData(
    getSettingsDocumentsControllerGetPreferencesQueryKey({
      domains: "appearance",
    }),
    { domains: {} },
  );
  queryClient.setQueryData(guildsKey, [
    createTestGuild("guild-1", "Alpha"),
    createTestGuild("guild-2", "Beta"),
    createTestGuild("guild-3", "Gamma"),
  ]);
  const request = vi.fn<typeof fetch>().mockImplementation((input) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname !== getUsersControllerGetUserPreferencesUrl())
      throw new Error(`Unexpected HTTP request: ${url.pathname}`);
    return Promise.resolve(
      Response.json(queryClient.getQueryData(preferencesKey)),
    );
  });
  const restore = configureApiClients({
    main: { baseUrl: "https://api.example.test", fetch: request },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  onTestFinished(() => {
    restore();
    queryClient.clear();
  });
  return {
    queryClient,
    preferencesKey,
    guildsKey,
    setPreferences,
    request,
    wrapper,
  };
};
