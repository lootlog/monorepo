import { useQuery } from "@tanstack/react-query";
import { User } from "@/hooks/api/use-user";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export type GuildMember = {
  id: string;
  userId: string;
  guildId: string;
  avatar?: string;
  type: string;
  name: string;
  user: User;
  roles: {
    position: number;
    color: number;
  }[];
};

export const useGuildMembers = (guildId?: string) => {
  const { client } = useAuthenticatedApiClient();

  const query = useQuery({
    queryKey: ["guild-members", guildId],
    queryFn: () => client.get<GuildMember[]>(`/guilds/${guildId}/members`),
    enabled: !!guildId,
    select: (response) => {
      const keyValue: Record<string, GuildMember> = {};
      response.data.forEach((member) => {
        keyValue[member.userId] = member;
      });

      return keyValue;
    },
  });

  return query;
};
