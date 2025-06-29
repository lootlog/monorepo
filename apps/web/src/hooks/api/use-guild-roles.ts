import { useQuery } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/use-guild-id";
import { Permission } from "@/hooks/api/use-guild-permissions";
import { useApiClient } from "@/hooks/api/use-api-client";

export type GuildRole = {
  id: string;
  guildId: string;
  name: string;
  color: number;
  permissions: Permission[];
  lvlRangeFrom: number;
  lvlRangeTo: number;
};

export const useGuildRoles = () => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  const query = useQuery({
    queryKey: ["guild-roles", guildId],
    queryFn: () => client.get<GuildRole[]>(`/guilds/${guildId}/roles`),
    enabled: !!guildId,
    select: (response) => response.data,
  });

  return query;
};
