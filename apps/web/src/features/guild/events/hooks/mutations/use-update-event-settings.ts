import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import type {
  UserGuildEventSettings,
  UpdateGuildEventSettingsPayload,
} from "@lootlog/types";
import { getEventsSettingsControllerGetSettingsQueryKey } from "@/lib/api/generated/main/event-settings/event-settings";

export const useUpdateEventSettings = (guildId: string) => {
  const queryClient = useQueryClient();
  const { client } = useApiClient();
  const queryKey = getEventsSettingsControllerGetSettingsQueryKey({ guildId });

  return useMutation<
    UserGuildEventSettings,
    Error,
    UpdateGuildEventSettingsPayload,
    { previous: UserGuildEventSettings | undefined }
  >({
    mutationFn: async (payload) => {
      const response = await client.patch<UserGuildEventSettings>(
        `/guilds/${guildId}/event-settings`,
        payload,
      );
      return response;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        queryKey,
      });
      const previous =
        queryClient.getQueryData<UserGuildEventSettings>(queryKey);
      queryClient.setQueryData(
        queryKey,
        (old: UserGuildEventSettings | undefined) => ({
          ...old,
          pinnedEvents: payload.pinnedEvents,
        }),
      );
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey,
      });
    },
  });
};
