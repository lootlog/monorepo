import { useQueryClient } from "@tanstack/react-query";
import {
  getEventsSettingsControllerGetSettingsQueryKey,
  useEventsSettingsControllerGetSettings,
  useEventsSettingsControllerUpdateSettings,
} from "@lootlog/api-client/react-query/main/event-settings";
import type { EventSettingsResponseDto } from "@lootlog/api-client/models/main/event-settings-response-dto";

export const useToggleEventPin = (guildId: string) => {
  const queryClient = useQueryClient();
  const { data: settings } = useEventsSettingsControllerGetSettings({
    guildId,
  });
  const settingsQueryKey = getEventsSettingsControllerGetSettingsQueryKey({
    guildId,
  });
  const updateSettings = useEventsSettingsControllerUpdateSettings({
    mutation: {
      onMutate: async ({ data }) => {
        await queryClient.cancelQueries({
          queryKey: settingsQueryKey,
        });

        const previous =
          queryClient.getQueryData<EventSettingsResponseDto>(settingsQueryKey);

        queryClient.setQueryData(
          settingsQueryKey,
          (old: EventSettingsResponseDto | undefined) => ({
            ...old,
            pinnedEvents: data.pinnedEvents,
          }),
        );

        return { previous };
      },
      onError: (_error, _payload, context) => {
        if (context?.previous) {
          queryClient.setQueryData(settingsQueryKey, context.previous);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({
          queryKey: settingsQueryKey,
        });
      },
    },
  });

  const togglePin = (eventId: string) => {
    const current = settings?.pinnedEvents ?? [];
    const isPinned = current.includes(eventId);
    const next = isPinned
      ? current.filter((id) => id !== eventId)
      : [eventId, ...current];
    updateSettings.mutate({
      pathParams: { guildId },
      data: { pinnedEvents: next },
    });
  };

  const isPinned = (eventId: string) =>
    (settings?.pinnedEvents ?? []).includes(eventId);

  return { togglePin, isPinned, isLoading: updateSettings.isPending };
};
