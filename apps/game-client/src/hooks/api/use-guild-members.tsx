import { useQuery } from "@tanstack/react-query";
import type { User } from "@/hooks/api/use-user";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { AxiosInstance } from "axios";

export type GuildMember = {
  id: number;
  userId: string;
  guildId: string;
  avatar?: string;
  type: string;
  name: string;
  user?: User;
  roles?: {
    position: number;
    color: number;
  }[];
};

export const useGuildMembers = (guildId?: string) => {
  const { client } = useAuthenticatedApiClient();

  const query = useQuery({
    queryKey: ["guild-members", guildId],
    queryFn: () => client.get<GuildMember[]>(`/guilds/${guildId}/members`),
    enabled: !!guildId && guildId !== "all",
    gcTime: Infinity,
    staleTime: 5 * 60 * 1000,
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

export const fetchGuildMembers = async (
  client: AxiosInstance,
  guildId: string,
): Promise<Record<string, GuildMember>> => {
  const response = await client.get<GuildMember[]>(
    `/guilds/${guildId}/members`,
  );

  const keyValue: Record<string, GuildMember> = {};
  response.data.forEach((member) => {
    keyValue[member.userId] = member;
  });

  return keyValue;
};
