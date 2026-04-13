import { useQuery } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import type { AxiosInstance } from "axios";
import type { GameGuildMember } from "@/types/guild-member";

export type GuildMember = GameGuildMember;
export const guildMembersQueryKey = (guildId?: string) =>
  ["guild-members-summary-v1", guildId] as const;

export const mapGuildMembersByUserId = (
  members: GuildMember[],
): Record<string, GuildMember> => {
  const membersByUserId: Record<string, GuildMember> = {};

  members.forEach((member) => {
    membersByUserId[member.userId] = member;
  });

  return membersByUserId;
};

export const useGuildMembers = (guildId?: string) => {
  const { client } = useAuthenticatedApiClient();

  const query = useQuery({
    queryKey: guildMembersQueryKey(guildId),
    queryFn: () =>
      client.get<GuildMember[]>(`/guilds/${guildId}/members/summary`),
    enabled: !!guildId && guildId !== "all",
    gcTime: Infinity,
    staleTime: 5 * 60 * 1000,
    select: (response) => mapGuildMembersByUserId(response.data),
  });

  return query;
};

export const fetchGuildMembers = async (
  client: AxiosInstance,
  guildId: string,
): Promise<Record<string, GuildMember>> => {
  const response = await client.get<GuildMember[]>(
    `/guilds/${guildId}/members/summary`,
  );

  return mapGuildMembersByUserId(response.data);
};
