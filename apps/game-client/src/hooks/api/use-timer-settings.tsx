import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateTimerSettingsPayload } from "@lootlog/types";
import {
  getTimerSettingsControllerGetGlobalSettingsQueryKey,
  getTimerSettingsControllerGetGuildSettingsQueryKey,
  timerSettingsControllerMigrateSettings,
  timerSettingsControllerUpdateGlobalSettings,
  timerSettingsControllerUpdateGuildSettings,
  useTimerSettingsControllerGetGlobalSettings,
  useTimerSettingsControllerGetGuildSettings,
} from "@/lib/api/generated/main/timer-settings/timer-settings";
import type {
  MigrateTimerSettingsDto,
  UpdateGuildTimerSettingsDto,
  UpdateTimerSettingsDto,
} from "@/lib/api/generated/main/model";

const TIMER_SETTINGS_QUERY_KEY =
  getTimerSettingsControllerGetGlobalSettingsQueryKey();

const GUILD_TIMER_SETTINGS_QUERY_KEY = (guildId: string) =>
  getTimerSettingsControllerGetGuildSettingsQueryKey({ guildId });

export const toUpdateTimerSettingsDto = (
  payload: UpdateTimerSettingsPayload,
): UpdateTimerSettingsDto => {
  const { timersColors, ...rest } = payload;
  const normalizedTimersColors = timersColors
    ? Object.fromEntries(
        Object.entries(timersColors).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      )
    : undefined;

  return {
    ...rest,
    ...(normalizedTimersColors && {
      timersColors: normalizedTimersColors,
    }),
  };
};

export const useTimerSettings = (enabled = true) => {
  return useTimerSettingsControllerGetGlobalSettings({
    query: {
      queryKey: TIMER_SETTINGS_QUERY_KEY,
      staleTime: 5 * 60 * 1000,
      refetchOnMount: "always",
      enabled,
    },
  });
};

export const useUpdateTimerSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateTimerSettingsPayload) =>
      timerSettingsControllerUpdateGlobalSettings(
        toUpdateTimerSettingsDto(payload),
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMER_SETTINGS_QUERY_KEY });
    },
  });
};

export const useGuildTimerSettings = (guildId: string) => {
  return useTimerSettingsControllerGetGuildSettings(
    { guildId },
    {
      query: {
        queryKey: GUILD_TIMER_SETTINGS_QUERY_KEY(guildId),
        enabled: !!guildId,
        staleTime: 5 * 60 * 1000,
      },
    },
  );
};

export const useUpdateGuildTimerSettings = (guildId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateGuildTimerSettingsDto) =>
      timerSettingsControllerUpdateGuildSettings({ guildId }, payload),
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
    mutationFn: (payload: MigrateTimerSettingsDto) =>
      timerSettingsControllerMigrateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TIMER_SETTINGS_QUERY_KEY });
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          typeof queryKey[0] === "string" &&
          queryKey[0].startsWith("/timer-settings/guilds/"),
      });
    },
  });
};
