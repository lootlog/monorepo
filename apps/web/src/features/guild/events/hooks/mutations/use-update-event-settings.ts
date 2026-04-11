import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import type {
  UserGuildEventSettings,
  UpdateGuildEventSettingsPayload,
} from "@lootlog/types";
import { eventSettingsQueryKey } from "../queries/use-event-settings";

export const useUpdateEventSettings = (guildId: string) => {
  const queryClient = useQueryClient();
  const { client } = useApiClient();

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
        queryKey: eventSettingsQueryKey(guildId),
      });
      const previous = queryClient.getQueryData<UserGuildEventSettings>(
        eventSettingsQueryKey(guildId),
      );
      queryClient.setQueryData(
        eventSettingsQueryKey(guildId),
        (old: UserGuildEventSettings | undefined) => ({
          ...old,
          pinnedEvents: payload.pinnedEvents,
        }),
      );
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          eventSettingsQueryKey(guildId),
          context.previous,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: eventSettingsQueryKey(guildId),
      });
    },
  });
};
