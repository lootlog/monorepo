import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { Guild } from "@/hooks/api/guilds/use-guild";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { mutationKeys, queryKeys } from "@/lib/query-keys";

type UpdateGuildConfigOptions = {
  vanityUrl: string | null;
};

type UpdateGuildConfigResponse = Guild;

export const useUpdateGuild = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { client } = useApiClient();

  const mutation = useMutation<
    UpdateGuildConfigResponse,
    unknown,
    UpdateGuildConfigOptions
  >({
    mutationFn: ({ vanityUrl }) => {
      return client.patch(`/guilds/${guildId}/config`, {
        vanityUrl,
      });
    },
    mutationKey: mutationKeys.guilds.updateConfig(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.guilds.current(guildId),
      });
    },
  });

  return mutation;
};
