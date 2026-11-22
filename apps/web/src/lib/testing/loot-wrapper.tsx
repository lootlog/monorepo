import { TEST_THEME_CONTEXT } from "@/lib/testing/theme-context";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { onTestFinished } from "vitest";
import type { PropsWithChildren } from "react";
import { ThemeContext } from "@/contexts/theme-context";
import { GuildWatchedItemsProvider } from "@/contexts/guild-watched-items-provider";
import {
  getGuildsControllerGetGuildByIdQueryKey,
  getGuildsControllerGetGuildPermissionsQueryKey,
  getNotificationsUserControllerGetUserTargetsQueryKey,
  getNotificationsUserControllerGetWatchedItemsQueryKey,
  type GuildResponseDtoOutput,
} from "@lootlog/client/main";
import type { Capability } from "@lootlog/domain/access-policy";
import { createOrganizationTestWrapper } from "./router";

export async function createLootTestWrapper({
  capabilities = [],
}: { capabilities?: Capability[] } = {}) {
  const RouterWrapper = await createOrganizationTestWrapper();

  const client = new QueryClient({
    defaultOptions: { queries: { staleTime: Infinity } },
  });

  client.setQueryData(
    getNotificationsUserControllerGetUserTargetsQueryKey(),
    [],
  );
  client.setQueryData(
    getNotificationsUserControllerGetWatchedItemsQueryKey(),
    [],
  );

  const guild: GuildResponseDtoOutput = {
    id: "guild-1",
    name: "Guild",
    ownerId: "owner",
    publicStatsCardEnabled: false,
    reservationMaxDurationMinutes: 120,
    reservationMinDurationMinutes: 5,
    reservationTimeGranularityMinutes: 5,
    reservationMaxAdvanceDays: 7,
    reservationActiveLimitPerSpot: 1,
    lootDrawExcludedNpcTypes: ["HERO", "EVENT_HERO", "TITAN"],
  };

  client.setQueryData(
    getGuildsControllerGetGuildByIdQueryKey({ guildId: "guild-1" }),
    guild,
  );
  client.setQueryData(
    getGuildsControllerGetGuildPermissionsQueryKey({ guildId: "guild-1" }),
    capabilities,
  );
  client.setQueryData(sessionQueryOptions.queryKey, {
    data: null,
    error: null,
  });
  onTestFinished(() => client.clear());

  return function LootTestWrapper({ children }: PropsWithChildren) {
    return (
      <RouterWrapper>
        <QueryClientProvider client={client}>
          <ThemeContext.Provider value={TEST_THEME_CONTEXT}>
            <NuqsTestingAdapter>
              <GuildWatchedItemsProvider>{children}</GuildWatchedItemsProvider>
            </NuqsTestingAdapter>
          </ThemeContext.Provider>
        </QueryClientProvider>
      </RouterWrapper>
    );
  };
}
