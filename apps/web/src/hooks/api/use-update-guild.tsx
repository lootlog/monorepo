import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { useApiClient } from "hooks/api/use-api-client";
import { Guild } from "hooks/api/use-guild";
import { useGuildId } from "hooks/use-guild-id";

type UpdateGuildConfigOptions = {
  vanityUrl: string | null;
};

type UpdateGuildConfigResponse = AxiosResponse<Guild>;

export const useUpdateGuild = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { client } = useApiClient();

  const mutation = useMutation<
    UpdateGuildConfigResponse,
    unknown,
    UpdateGuildConfigOptions
  >({
    mutationFn: async ({ vanityUrl }) => {
      return client.patch(`/guilds/${guildId}/config`, {
        vanityUrl,
      });
    },
    mutationKey: ["update-guild-config"],
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["guilds", guildId],
      });
    },
  });

  return mutation;
};
