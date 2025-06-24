import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { Permission } from "@/hooks/api/use-guild-permissions";

import { useGuildId } from "@/hooks/use-guild-id";
import { AxiosResponse } from "axios";
import { GuildRole } from "@/hooks/api/use-guild-roles";

type UpdateGuildRoleOptions = {
  roleId: string;
  permissions: Permission[];
};

type UpdateGuildRoleResponse = AxiosResponse<GuildRole>;

export const useUpdateGuildRole = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { client } = useApiClient();

  const mutation = useMutation<
    UpdateGuildRoleResponse,
    unknown,
    UpdateGuildRoleOptions
  >({
    mutationFn: async ({ permissions, roleId }) => {
      return client.patch(`/guilds/${guildId}/roles/${roleId}/permissions`, {
        permissions,
      });
    },
    mutationKey: ["update-guild-role"],
    onSuccess: (response) => {
      // queryClient.invalidateQueries({
      //   queryKey: ["guild-roles", guildId],
      // });
      queryClient.setQueryData(["guild-role", guildId], response.data);
    },
  });

  return mutation;
};
