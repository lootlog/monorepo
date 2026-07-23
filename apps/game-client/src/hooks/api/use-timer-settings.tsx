import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateTimerSettingsPayload } from "@lootlog/types";
import {
  getTimerSettingsControllerGetGlobalSettingsQueryKey,
  timerSettingsControllerMigrateSettings,
  timerSettingsControllerUpdateGlobalSettings,
  useTimerSettingsControllerGetGlobalSettings,
} from "@lootlog/api-client/react-query/main/timer-settings";
import type { MigrateTimerSettingsDto } from "@lootlog/api-client/models/main/migrate-timer-settings-dto";
import type { UpdateTimerSettingsDto } from "@lootlog/api-client/models/main/update-timer-settings-dto";

const TIMER_SETTINGS_QUERY_KEY =
  getTimerSettingsControllerGetGlobalSettingsQueryKey();

const toUpdateTimerSettingsDto = (
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
      refetchOnMount: false,
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
      queryClient.invalidateQueries({
        predicate: ({ queryKey }) =>
          typeof queryKey[0] === "string" && queryKey[0].startsWith("/timers"),
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
