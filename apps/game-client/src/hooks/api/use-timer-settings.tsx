import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchGuildTimerSettings,
  fetchTimerSettings,
  migrateTimerSettings,
  updateGuildTimerSettings,
  updateTimerSettings,
} from "@/api";
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
  const query = useQuery({
    queryKey: TIMER_SETTINGS_QUERY_KEY,
    queryFn: () => fetchTimerSettings(),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: "always",
    enabled,
  });

  return query;
};

export const useUpdateTimerSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateTimerSettingsPayload) =>
      updateTimerSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMER_SETTINGS_QUERY_KEY });
    },
  });
};

const useGuildTimerSettings = (guildId: string) => {
  const query = useQuery({
    queryKey: GUILD_TIMER_SETTINGS_QUERY_KEY(guildId),
    queryFn: () => fetchGuildTimerSettings(guildId),
    enabled: !!guildId,
    staleTime: 5 * 60 * 1000,
  });

  return query;
};

const useUpdateGuildTimerSettings = (guildId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateGuildTimerSettingsPayload) =>
      updateGuildTimerSettings(guildId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: GUILD_TIMER_SETTINGS_QUERY_KEY(guildId),
      });
    },
  });
};

export const useMigrateTimerSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MigrateTimerSettingsPayload) =>
      migrateTimerSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMER_SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({
        queryKey: ["timer-settings", "guild"],
      });
    },
  });
};
