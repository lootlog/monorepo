import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/use-guild-id";
import { GuildMember } from "@/hooks/api/use-guild-member";

export const useGuildMembers = () => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  const query = useQuery({
    queryKey: ["members", guildId],
    queryFn: () => client.get<GuildMember[]>(`/guilds/${guildId}/members`),
    enabled: !!guildId,
    select: (response) => response.data,
  });

  return query;
};
