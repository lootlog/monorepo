import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import type { Permission } from "@lootlog/types";

type UseGuildPermissionsOptions = {
  guildId?: string;
};

export const useGuildPermissions = ({
  guildId,
}: UseGuildPermissionsOptions) => {
  const { client } = useAuthenticatedApiClient();

  const query = useQuery({
    queryKey: ["guild-permissions", guildId],
    queryFn: () => client.get<Permission[]>(`/guilds/${guildId}/permissions`),
    enabled: !!guildId,
    select: (response) => response.data,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return query;
};
