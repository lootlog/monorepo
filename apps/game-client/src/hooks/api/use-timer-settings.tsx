import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { API_URL } from "@/config/api";
import type {
  UserTimerSettings,
  UserGuildTimerSettings,
  UpdateTimerSettingsPayload,
  UpdateGuildTimerSettingsPayload,
  MigrateTimerSettingsPayload,
} from "@lootlog/types";

const TIMER_SETTINGS_QUERY_KEY = ["timer-settings"];
const GUILD_TIMER_SETTINGS_QUERY_KEY = (guildId: string) => [
  "timer-settings",
  "guild",
  guildId,
];

export const useTimerSettings = (enabled = true) => {
  const { client } = useAuthenticatedApiClient();

  const query = useQuery({
    queryKey: TIMER_SETTINGS_QUERY_KEY,
    queryFn: () => client.get<UserTimerSettings>(`${API_URL}/timer-settings`),
    select: (response) => response.data,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    enabled,
  });

  return query;
};

export const useUpdateTimerSettings = () => {
  const { client } = useAuthenticatedApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateTimerSettingsPayload) =>
      client.patch<UserTimerSettings>(`${API_URL}/timer-settings`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMER_SETTINGS_QUERY_KEY });
    },
  });
};

export const useGuildTimerSettings = (guildId: string) => {
  const { client } = useAuthenticatedApiClient();

  const query = useQuery({
    queryKey: GUILD_TIMER_SETTINGS_QUERY_KEY(guildId),
    queryFn: () =>
      client.get<UserGuildTimerSettings>(
        `${API_URL}/timer-settings/guilds/${guildId}`,
      ),
    enabled: !!guildId,
    select: (response) => response.data,
    staleTime: 5 * 60 * 1000,
  });

  return query;
};

export const useUpdateGuildTimerSettings = (guildId: string) => {
  const { client } = useAuthenticatedApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateGuildTimerSettingsPayload) =>
      client.patch<UserGuildTimerSettings>(
        `${API_URL}/timer-settings/guilds/${guildId}`,
        payload,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: GUILD_TIMER_SETTINGS_QUERY_KEY(guildId),
      });
    },
  });
};

export const useMigrateTimerSettings = () => {
  const { client } = useAuthenticatedApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MigrateTimerSettingsPayload) =>
      client.post(`${API_URL}/timer-settings/migrate`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMER_SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: ["timer-settings", "guild"],
      });
    },
  });
};
