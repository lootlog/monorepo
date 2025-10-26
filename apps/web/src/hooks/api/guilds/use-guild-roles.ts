import { useQuery } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { Permission } from "@/hooks/api/guilds/use-guild-permissions";

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
