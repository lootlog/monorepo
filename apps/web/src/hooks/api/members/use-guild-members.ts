import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { GuildMember } from "@/hooks/api/members/use-guild-member";

export const useGuildMembers = (includeInactive = false) => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  const query = useQuery({
    queryKey: ["members", guildId, includeInactive],
    queryFn: () =>
      client.get<GuildMember[]>(`/guilds/${guildId}/members`, {
        params: { includeInactive: includeInactive.toString() },
      }),
    enabled: !!guildId,
    select: (response) => response.data,
  });

  return query;
};
