import { QueryClientProvider } from "@tanstack/react-query";
import { onTestFinished, vi } from "vitest";
import type { ReactNode } from "react";
import { configureApiClients } from "@lootlog/client/transport";
import {
  getUsersControllerGetCurrentUserAccessibleGuildsQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  getUsersControllerGetUserPreferencesUrl,
  type GuildResponseDtoOutput,
  type UserPreferencesResponseDtoOutput,
} from "@lootlog/client/main";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import { queryClient } from "@/lib/query-client";
import { settingsPatchQueue } from "@/features/settings/persistence/settings-patch-client";
import {
  createSettingsDocuments,
  seedSettingsDocuments,
} from "./settings-documents-fixtures";

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
  reservationMaxDurationMinutes: 240,
  reservationMinDurationMinutes: 15,
  reservationTimeGranularityMinutes: 15,
  reservationMaxAdvanceDays: 7,
  reservationActiveLimitPerSpot: 1,
});

export const createGuildPreferencesTest = () => {
  // Persistence helpers read the shared client and queue, so tests must
  // seed the one and drop patches the previous test left pending in the other.
  queryClient.clear();
  settingsPatchQueue.reset();
  queryClient.setDefaultOptions({
    queries: { retry: false, staleTime: Infinity },
    mutations: { retry: false },
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
  seedSettingsDocuments(queryClient, createSettingsDocuments());
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
    settingsPatchQueue.reset();
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
