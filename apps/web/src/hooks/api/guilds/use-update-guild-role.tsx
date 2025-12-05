import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { Permission } from "@lootlog/types";

import { useGuildId } from "@/hooks/context/use-guild-id";
import type { AxiosResponse } from "axios";
import type { GuildRole } from "@/hooks/api/guilds/use-guild-roles";

type UpdateGuildRoleOptions = {
  roleId: string;
  permissions: Permission[];
  lvlRangeFrom: number;
  lvlRangeTo: number;
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
    mutationFn: ({ roleId, ...rest }) => {
      return client.patch(
        `/guilds/${guildId}/roles/${roleId}/permissions`,
        rest,
      );
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
