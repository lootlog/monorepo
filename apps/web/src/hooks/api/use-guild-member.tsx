import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/use-guild-id";
import { GuildRole } from "@/hooks/api/use-guild-roles";

export type GuildMember = {
  id: string;
  name: string;
  avatar: string | null;
  updatedAt: string;
  roles: GuildRole[];
  userId: string;
  globalUserId?: string;
};

export const useGuildMember = () => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  const query = useQuery({
    queryKey: ["member", guildId, "@me"],
    queryFn: () => client.get<GuildMember>(`/guilds/${guildId}/members/@me`),
    enabled: !!guildId,
    select: (response) => response.data,
  });

  return query;
};
