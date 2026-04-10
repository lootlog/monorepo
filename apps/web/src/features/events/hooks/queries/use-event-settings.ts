import { queryOptions, useQuery } from "@tanstack/react-query";
import type { UserGuildEventSettings } from "@lootlog/types";
import { apiClient, type ApiRequestConfig } from "@/lib/api-client/api-client";

export const eventSettingsQueryKey = (guildId: string) => [
  "event-settings",
  guildId,
];

type EventSettingsQueryOptionsOptions = {
  suppressRouteErrorToast?: boolean;
};

export const eventSettingsQueryOptions = (
  guildId: string,
  { suppressRouteErrorToast = false }: EventSettingsQueryOptionsOptions = {},
) =>
  queryOptions({
    queryKey: eventSettingsQueryKey(guildId),
    queryFn: async () => {
      const response = await apiClient.get<UserGuildEventSettings>(
        `/guilds/${guildId}/event-settings`,
        {
          suppressRouteErrorToast,
        } as ApiRequestConfig,
      );
      return response.data;
    },
    enabled: !!guildId,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });

export const useEventSettings = (guildId: string) => {
  return useQuery(eventSettingsQueryOptions(guildId));
};
