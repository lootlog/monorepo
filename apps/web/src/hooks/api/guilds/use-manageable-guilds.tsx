import { useApiClient } from "@/hooks/api/use-api-client";
import type { Guild } from "@/hooks/api/guilds/use-guild";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export const useManageableGuilds = (enabled = true) => {
  const { client } = useApiClient();

  const query = useQuery({
    queryKey: queryKeys.guilds.manageable(),
    queryFn: () => client.get<Guild[]>(`/guilds/@me/manageable`),
    select: (data) => data,
    enabled,
    staleTime: 0,
  });

  return query;
};
