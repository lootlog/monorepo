import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { Permission } from "@/hooks/api/use-guild-permissions";

import { useGuildId } from "@/hooks/use-guild-id";

type UpdateGuildRoleOptions = {
  roleId: string;
  permissions: Permission[];
};

type UpdateGuildRoleResponse = unknown;

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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["guild-roles", guildId],
      });
    },
  });

  return mutation;
};
