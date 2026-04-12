import { useQuery } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { guildMembersQueryOptions } from "./use-guild-members-query-options";

export const useGuildMembers = (includeInactive = false) => {
  const guildId = useGuildId();

  const query = useQuery(
    guildMembersQueryOptions(guildId ?? "", {
      includeInactive,
    }),
  );

  return query;
};
