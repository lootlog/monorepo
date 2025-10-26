import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosResponse } from "axios";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { Guild } from "@/hooks/api/guilds/use-guild";
import { useGuildId } from "@/hooks/context/use-guild-id";

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
    mutationFn: ({ vanityUrl }) => {
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
