import { useMutation } from "@tanstack/react-query";
import { API_URL } from "config/api";
import { useApiClient } from "hooks/api/use-api-client";

export type InitializeGuildOptions = {
  modRoleId: string;
  accessRoleId: string;
  guildId: string;
};

export const useInitializeGuild = () => {
  const { client } = useApiClient();

  return useMutation({
    mutationFn: async ({ guildId, ...rest }: InitializeGuildOptions) => {
      return client.post(`${API_URL}/guilds/${guildId}/initialize`, {
        ...rest,
      });
    },
  });
};
