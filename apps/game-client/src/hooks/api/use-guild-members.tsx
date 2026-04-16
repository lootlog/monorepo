import { useQuery } from "@tanstack/react-query";
import {
  fetchGuildMembers,
  mapGuildMembersByUserId,
  type GuildMember,
} from "@/api";

export type { GuildMember } from "@/api";
export { fetchGuildMembers, mapGuildMembersByUserId } from "@/api";
export const guildMembersQueryKey = (guildId?: string) =>
  ["guild-members-summary-v1", guildId] as const;

export const useGuildMembers = (guildId?: string) => {
  const query = useQuery({
    queryKey: guildMembersQueryKey(guildId),
    queryFn: () => fetchGuildMembers(guildId as string),
    enabled: !!guildId && guildId !== "all",
    gcTime: Infinity,
    staleTime: 5 * 60 * 1000,
  });

  return query;
};
