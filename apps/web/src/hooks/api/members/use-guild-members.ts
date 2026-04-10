import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { guildMembersQueryOptions } from "./use-guild-members-query-options";

export const useGuildMembers = (includeInactive = false) => {
  const guildId = useGuildId();
  useApiClient();

  const query = useQuery(
    guildMembersQueryOptions(guildId ?? "", {
      includeInactive,
    }),
  );

  return query;
};
