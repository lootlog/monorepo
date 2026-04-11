import { queryOptions, useQuery } from "@tanstack/react-query";
import type { UserGuildEventSettings } from "@lootlog/types";
import { apiClient } from "@/lib/api-client/api-client";
import { queryKeys } from "@/lib/query-keys";

export const eventSettingsQueryKey = (guildId: string) =>
  queryKeys.events.settings(guildId);

export const eventSettingsQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: eventSettingsQueryKey(guildId),
    queryFn: () =>
      apiClient.get<UserGuildEventSettings>(
        `/guilds/${guildId}/event-settings`,
      ),
    enabled: !!guildId,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

export const useEventSettings = (guildId: string) => {
  return useQuery(eventSettingsQueryOptions(guildId));
};
